import {
  CompositeNumberInput,
  CompositeSlider,
  FormControl,
  FormLabel,
} from '@invoke-ai/ui';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { setRefinerStart } from 'features/sdxl/store/sdxlSlice';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const ParamSDXLRefinerStart = () => {
  const refinerStart = useAppSelector((s) => s.sdxl.refinerStart);
  const dispatch = useAppDispatch();
  const handleChange = useCallback(
    (v: number) => dispatch(setRefinerStart(v)),
    [dispatch]
  );
  const { t } = useTranslation();

  return (
    <FormControl>
      <FormLabel>{t('sdxl.refinerStart')}</FormLabel>
      <CompositeSlider
        step={0.01}
        min={0}
        max={1}
        onChange={handleChange}
        defaultValue={0.8}
        value={refinerStart}
        marks
      />
      <CompositeNumberInput
        step={0.01}
        min={0}
        max={1}
        onChange={handleChange}
        defaultValue={0.8}
        value={refinerStart}
      />
    </FormControl>
  );
};

export default memo(ParamSDXLRefinerStart);
