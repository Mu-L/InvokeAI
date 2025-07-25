import { Flex, Spacer } from '@invoke-ai/ui-library';
import { EntityListGlobalActionBarAddLayerMenu } from 'features/controlLayers/components/CanvasEntityList/EntityListGlobalActionBarAddLayerMenu';
import { EntityListSelectedEntityActionBarDuplicateButton } from 'features/controlLayers/components/CanvasEntityList/EntityListSelectedEntityActionBarDuplicateButton';
import { EntityListSelectedEntityActionBarFill } from 'features/controlLayers/components/CanvasEntityList/EntityListSelectedEntityActionBarFill';
import { EntityListSelectedEntityActionBarFilterButton } from 'features/controlLayers/components/CanvasEntityList/EntityListSelectedEntityActionBarFilterButton';
import { EntityListSelectedEntityActionBarInvertMaskButton } from 'features/controlLayers/components/CanvasEntityList/EntityListSelectedEntityActionBarInvertMaskButton';
import { EntityListSelectedEntityActionBarOpacity } from 'features/controlLayers/components/CanvasEntityList/EntityListSelectedEntityActionBarOpacity';
import { EntityListSelectedEntityActionBarSelectObjectButton } from 'features/controlLayers/components/CanvasEntityList/EntityListSelectedEntityActionBarSelectObjectButton';
import { EntityListSelectedEntityActionBarTransformButton } from 'features/controlLayers/components/CanvasEntityList/EntityListSelectedEntityActionBarTransformButton';
import { EntityListNonRasterLayerToggle } from 'features/controlLayers/components/common/CanvasNonRasterLayersIsHiddenToggle';
import { memo } from 'react';

import { EntityListSelectedEntityActionBarSaveToAssetsButton } from './EntityListSelectedEntityActionBarSaveToAssetsButton';

export const EntityListSelectedEntityActionBar = memo(() => {
  return (
    <Flex w="full" gap={2} alignItems="center" ps={1}>
      <EntityListSelectedEntityActionBarOpacity />
      <Spacer />
      <EntityListSelectedEntityActionBarFill />
      <Flex h="full">
        <EntityListSelectedEntityActionBarSelectObjectButton />
        <EntityListSelectedEntityActionBarFilterButton />
        <EntityListSelectedEntityActionBarTransformButton />
        <EntityListSelectedEntityActionBarInvertMaskButton />
        <EntityListSelectedEntityActionBarSaveToAssetsButton />
        <EntityListSelectedEntityActionBarDuplicateButton />
        <EntityListNonRasterLayerToggle />
        <EntityListGlobalActionBarAddLayerMenu />
      </Flex>
    </Flex>
  );
});

EntityListSelectedEntityActionBar.displayName = 'EntityListSelectedEntityActionBar';
