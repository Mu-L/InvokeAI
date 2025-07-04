from math import floor
from typing import Callable, Optional, TypeAlias

import torch
from PIL import Image

from invokeai.app.services.session_processor.session_processor_common import CanceledException
from invokeai.backend.model_manager.taxonomy import BaseModelType
from invokeai.backend.stable_diffusion.diffusers_pipeline import PipelineIntermediateState

# See scripts/generate_vae_linear_approximation.py for generating these factors.

# fast latents preview matrix for sdxl
# generated by @StAlKeR7779
SDXL_LATENT_RGB_FACTORS = [
    #   R        G        B
    [0.3816, 0.4930, 0.5320],
    [-0.3753, 0.1631, 0.1739],
    [0.1770, 0.3588, -0.2048],
    [-0.4350, -0.2644, -0.4289],
]
SDXL_SMOOTH_MATRIX = [
    [0.0358, 0.0964, 0.0358],
    [0.0964, 0.4711, 0.0964],
    [0.0358, 0.0964, 0.0358],
]

# origingally adapted from code by @erucipe and @keturn here:
# https://discuss.huggingface.co/t/decoding-latents-to-rgb-without-upscaling/23204/7
# these updated numbers for v1.5 are from @torridgristle
SD1_5_LATENT_RGB_FACTORS = [
    #    R        G        B
    [0.3444, 0.1385, 0.0670],  # L1
    [0.1247, 0.4027, 0.1494],  # L2
    [-0.3192, 0.2513, 0.2103],  # L3
    [-0.1307, -0.1874, -0.7445],  # L4
]

SD3_5_LATENT_RGB_FACTORS = [
    [-0.05240681, 0.03251581, 0.0749016],
    [-0.0580572, 0.00759826, 0.05729818],
    [0.16144888, 0.01270368, -0.03768577],
    [0.14418615, 0.08460266, 0.15941818],
    [0.04894035, 0.0056485, -0.06686988],
    [0.05187166, 0.19222395, 0.06261094],
    [0.1539433, 0.04818359, 0.07103094],
    [-0.08601796, 0.09013458, 0.10893912],
    [-0.12398469, -0.06766567, 0.0033688],
    [-0.0439737, 0.07825329, 0.02258823],
    [0.03101129, 0.06382551, 0.07753657],
    [-0.01315361, 0.08554491, -0.08772475],
    [0.06464487, 0.05914605, 0.13262741],
    [-0.07863674, -0.02261737, -0.12761454],
    [-0.09923835, -0.08010759, -0.06264447],
    [-0.03392309, -0.0804029, -0.06078822],
]

FLUX_LATENT_RGB_FACTORS = [
    [-0.0412, 0.0149, 0.0521],
    [0.0056, 0.0291, 0.0768],
    [0.0342, -0.0681, -0.0427],
    [-0.0258, 0.0092, 0.0463],
    [0.0863, 0.0784, 0.0547],
    [-0.0017, 0.0402, 0.0158],
    [0.0501, 0.1058, 0.1152],
    [-0.0209, -0.0218, -0.0329],
    [-0.0314, 0.0083, 0.0896],
    [0.0851, 0.0665, -0.0472],
    [-0.0534, 0.0238, -0.0024],
    [0.0452, -0.0026, 0.0048],
    [0.0892, 0.0831, 0.0881],
    [-0.1117, -0.0304, -0.0789],
    [0.0027, -0.0479, -0.0043],
    [-0.1146, -0.0827, -0.0598],
]

COGVIEW4_LATENT_RGB_FACTORS = [
    [0.00408832, -0.00082485, -0.00214816],
    [0.00084172, 0.00132241, 0.00842067],
    [-0.00466737, -0.00983181, -0.00699561],
    [0.03698397, -0.04797235, 0.03585809],
    [0.00234701, -0.00124326, 0.00080869],
    [-0.00723903, -0.00388422, -0.00656606],
    [-0.00970917, -0.00467356, -0.00971113],
    [0.17292486, -0.03452463, -0.1457515],
    [0.02330308, 0.02942557, 0.02704329],
    [-0.00903131, -0.01499841, -0.01432564],
    [0.01250298, 0.0019407, -0.02168986],
    [0.01371188, 0.00498283, -0.01302135],
    [0.42396525, 0.4280575, 0.42148206],
    [0.00983825, 0.00613302, 0.00610316],
    [0.00473307, -0.00889551, -0.00915924],
    [-0.00955853, -0.00980067, -0.00977842],
]


def sample_to_lowres_estimated_image(
    samples: torch.Tensor, latent_rgb_factors: torch.Tensor, smooth_matrix: Optional[torch.Tensor] = None
):
    if samples.dim() == 4:
        samples = samples[0]
    latent_image = samples.permute(1, 2, 0) @ latent_rgb_factors

    if smooth_matrix is not None:
        latent_image = latent_image.unsqueeze(0).permute(3, 0, 1, 2)
        latent_image = torch.nn.functional.conv2d(latent_image, smooth_matrix.reshape((1, 1, 3, 3)), padding=1)
        latent_image = latent_image.permute(1, 2, 3, 0).squeeze(0)

    latents_ubyte = (
        ((latent_image + 1) / 2).clamp(0, 1).mul(0xFF).byte()  # change scale from -1..1 to 0..1  # to 0..255
    ).cpu()

    return Image.fromarray(latents_ubyte.numpy())


def calc_percentage(intermediate_state: PipelineIntermediateState) -> float:
    """Calculate the percentage of completion of denoising."""

    step = intermediate_state.step
    total_steps = intermediate_state.total_steps
    order = intermediate_state.order

    if total_steps == 0:
        return 0.0
    if order == 2:
        # Prevent division by zero when total_steps is 1 or 2
        denominator = floor(total_steps / 2)
        if denominator == 0:
            return 0.0
        return floor(step / 2) / denominator
    # order == 1
    return step / total_steps


SignalProgressFunc: TypeAlias = Callable[[str, float | None, Image.Image | None, tuple[int, int] | None], None]


def diffusion_step_callback(
    signal_progress: SignalProgressFunc,
    intermediate_state: PipelineIntermediateState,
    base_model: BaseModelType,
    is_canceled: Callable[[], bool],
) -> None:
    if is_canceled():
        raise CanceledException

    # Some schedulers report not only the noisy latents at the current timestep,
    # but also their estimate so far of what the de-noised latents will be. Use
    # that estimate if it is available.
    if intermediate_state.predicted_original is not None:
        sample = intermediate_state.predicted_original
    else:
        sample = intermediate_state.latents

    smooth_matrix: list[list[float]] | None = None
    if base_model in [BaseModelType.StableDiffusion1, BaseModelType.StableDiffusion2]:
        latent_rgb_factors = SD1_5_LATENT_RGB_FACTORS
    elif base_model in [BaseModelType.StableDiffusionXL, BaseModelType.StableDiffusionXLRefiner]:
        latent_rgb_factors = SDXL_LATENT_RGB_FACTORS
        smooth_matrix = SDXL_SMOOTH_MATRIX
    elif base_model == BaseModelType.StableDiffusion3:
        latent_rgb_factors = SD3_5_LATENT_RGB_FACTORS
    elif base_model == BaseModelType.CogView4:
        latent_rgb_factors = COGVIEW4_LATENT_RGB_FACTORS
    elif base_model == BaseModelType.Flux:
        latent_rgb_factors = FLUX_LATENT_RGB_FACTORS
    else:
        raise ValueError(f"Unsupported base model: {base_model}")

    latent_rgb_factors_torch = torch.tensor(latent_rgb_factors, dtype=sample.dtype, device=sample.device)
    smooth_matrix_torch = (
        torch.tensor(smooth_matrix, dtype=sample.dtype, device=sample.device) if smooth_matrix else None
    )
    image = sample_to_lowres_estimated_image(
        samples=sample, latent_rgb_factors=latent_rgb_factors_torch, smooth_matrix=smooth_matrix_torch
    )

    width = image.width * 8
    height = image.height * 8
    percentage = calc_percentage(intermediate_state)

    signal_progress("Denoising", percentage, image, (width, height))
