import type { TooltipProps } from '@invoke-ai/ui-library';
import { Divider, Flex, ListItem, Text, Tooltip, UnorderedList } from '@invoke-ai/ui-library';
import { useStore } from '@nanostores/react';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { debounce } from 'es-toolkit/compat';
import { selectIterations } from 'features/controlLayers/store/paramsSlice';
import { selectDynamicPromptsIsLoading } from 'features/dynamicPrompts/store/dynamicPromptsSlice';
import { selectAutoAddBoardId } from 'features/gallery/store/gallerySelectors';
import { $isInPublishFlow, useIsWorkflowPublished } from 'features/nodes/components/sidePanel/workflow/publish';
import { selectNodesSlice } from 'features/nodes/store/selectors';
import type { NodesState } from 'features/nodes/store/types';
import type { BatchSizeResult } from 'features/nodes/util/node/resolveBatchValue';
import { getBatchSize } from 'features/nodes/util/node/resolveBatchValue';
import type { Reason } from 'features/queue/store/readiness';
import { $isReadyToEnqueue, $reasonsWhyCannotEnqueue, selectPromptsCount } from 'features/queue/store/readiness';
import { selectActiveTab } from 'features/ui/store/uiSelectors';
import type { PropsWithChildren } from 'react';
import { memo, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { enqueueMutationFixedCacheKeyOptions, useEnqueueBatchMutation } from 'services/api/endpoints/queue';
import { useBoardName } from 'services/api/hooks/useBoardName';

type Props = TooltipProps & {
  prepend?: boolean;
};

export const InvokeButtonTooltip = ({ prepend, children, ...rest }: PropsWithChildren<Props>) => {
  return (
    <Tooltip label={<TooltipContent prepend={prepend} />} maxW={512} {...rest}>
      {children}
    </Tooltip>
  );
};

const TooltipContent = memo(({ prepend = false }: { prepend?: boolean }) => {
  const activeTab = useAppSelector(selectActiveTab);

  if (activeTab === 'canvas' || activeTab === 'generate') {
    return <CanvasTabTooltipContent prepend={prepend} />;
  }

  if (activeTab === 'workflows') {
    return <WorkflowsTabTooltipContent prepend={prepend} />;
  }

  if (activeTab === 'upscaling') {
    return <UpscaleTabTooltipContent prepend={prepend} />;
  }

  return null;
});
TooltipContent.displayName = 'TooltipContent';

const CanvasTabTooltipContent = memo(({ prepend = false }: { prepend?: boolean }) => {
  const isReady = useStore($isReadyToEnqueue);
  const reasons = useStore($reasonsWhyCannotEnqueue);

  return (
    <Flex flexDir="column" gap={1}>
      <IsReadyText isReady={isReady} prepend={prepend} />
      <QueueCountPredictionCanvasOrUpscaleTab />
      {reasons.length > 0 && (
        <>
          <StyledDivider />
          <ReasonsList reasons={reasons} />
        </>
      )}
      <StyledDivider />
      <AddingToText />
    </Flex>
  );
});
CanvasTabTooltipContent.displayName = 'CanvasTabTooltipContent';

const UpscaleTabTooltipContent = memo(({ prepend = false }: { prepend?: boolean }) => {
  const isReady = useStore($isReadyToEnqueue);
  const reasons = useStore($reasonsWhyCannotEnqueue);

  return (
    <Flex flexDir="column" gap={1}>
      <IsReadyText isReady={isReady} prepend={prepend} />
      <QueueCountPredictionCanvasOrUpscaleTab />
      {reasons.length > 0 && (
        <>
          <StyledDivider />
          <ReasonsList reasons={reasons} />
        </>
      )}
    </Flex>
  );
});
UpscaleTabTooltipContent.displayName = 'UpscaleTabTooltipContent';

const WorkflowsTabTooltipContent = memo(({ prepend = false }: { prepend?: boolean }) => {
  const isReady = useStore($isReadyToEnqueue);
  const reasons = useStore($reasonsWhyCannotEnqueue);

  return (
    <Flex flexDir="column" gap={1}>
      <IsReadyText isReady={isReady} prepend={prepend} />
      <QueueCountPredictionWorkflowsTab />
      {reasons.length > 0 && (
        <>
          <StyledDivider />
          <ReasonsList reasons={reasons} />
        </>
      )}
    </Flex>
  );
});
WorkflowsTabTooltipContent.displayName = 'WorkflowsTabTooltipContent';

const QueueCountPredictionCanvasOrUpscaleTab = memo(() => {
  const { t } = useTranslation();
  const promptsCount = useAppSelector(selectPromptsCount);
  const iterationsCount = useAppSelector(selectIterations);

  const text = useMemo(() => {
    const generationCount = Math.min(promptsCount * iterationsCount, 10000);
    const prompts = t('queue.prompts', { count: promptsCount });
    const iterations = t('queue.iterations', { count: iterationsCount });
    const generations = t('queue.generations', { count: generationCount });
    return `${promptsCount} ${prompts} \u00d7 ${iterationsCount} ${iterations} -> ${generationCount} ${generations}`.toLowerCase();
  }, [iterationsCount, promptsCount, t]);

  return <Text>{text}</Text>;
});
QueueCountPredictionCanvasOrUpscaleTab.displayName = 'QueueCountPredictionCanvasOrUpscaleTab';

const QueueCountPredictionWorkflowsTab = memo(() => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const nodesState = useAppSelector(selectNodesSlice);
  const [batchSize, setBatchSize] = useState<BatchSizeResult | 'LOADING'>('LOADING');
  const debouncedUpdateBatchSize = useMemo(
    () =>
      debounce(async (nodesState: NodesState) => {
        setBatchSize('LOADING');
        const batchSize = await getBatchSize(nodesState, dispatch);
        setBatchSize(batchSize);
      }, 300),
    [dispatch]
  );
  useEffect(() => {
    debouncedUpdateBatchSize(nodesState);
  }, [debouncedUpdateBatchSize, nodesState]);
  const iterationsCount = useAppSelector(selectIterations);

  const text = useMemo(() => {
    if (batchSize === 'LOADING') {
      return `${t('common.loading')}...`;
    }
    const iterations = t('queue.iterations', { count: iterationsCount });
    if (batchSize === 'NO_BATCHES') {
      const generationCount = Math.min(10000, iterationsCount);
      const generations = t('queue.generations', { count: generationCount });
      return `${iterationsCount} ${iterations} -> ${generationCount} ${generations}`.toLowerCase();
    }
    if (batchSize === 'EMPTY_BATCHES') {
      return t('parameters.invoke.batchNodeEmptyCollection');
    }
    if (batchSize === 'MISMATCHED_BATCH_GROUP') {
      return t('parameters.invoke.batchNodeCollectionSizeMismatchNoGroupId');
    }
    const generationCount = Math.min(batchSize * iterationsCount, 10000);
    const generations = t('queue.generations', { count: generationCount });
    return `${batchSize} ${t('queue.batchSize')} \u00d7 ${iterationsCount} ${iterations} -> ${generationCount} ${generations}`.toLowerCase();
  }, [batchSize, iterationsCount, t]);

  return <Text>{text}</Text>;
});
QueueCountPredictionWorkflowsTab.displayName = 'QueueCountPredictionWorkflowsTab';

const IsReadyText = memo(({ isReady, prepend }: { isReady: boolean; prepend: boolean }) => {
  const { t } = useTranslation();
  const isLoadingDynamicPrompts = useAppSelector(selectDynamicPromptsIsLoading);
  const [_, enqueueMutation] = useEnqueueBatchMutation(enqueueMutationFixedCacheKeyOptions);
  const isInPublishFlow = useStore($isInPublishFlow);
  const isPublished = useIsWorkflowPublished();

  const text = useMemo(() => {
    if (enqueueMutation.isLoading) {
      return t('queue.enqueueing');
    }
    if (isLoadingDynamicPrompts) {
      return t('dynamicPrompts.loading');
    }
    if (isInPublishFlow) {
      return t('workflows.builder.publishInProgress');
    }
    if (isPublished) {
      return t('workflows.builder.publishedWorkflowIsLocked');
    }
    if (isReady) {
      if (prepend) {
        return t('queue.queueFront');
      }
      return t('queue.queueBack');
    }
    return t('queue.notReady');
  }, [enqueueMutation.isLoading, isLoadingDynamicPrompts, isInPublishFlow, isPublished, isReady, t, prepend]);

  return <Text fontWeight="semibold">{text}</Text>;
});
IsReadyText.displayName = 'IsReadyText';

const ReasonsList = memo(({ reasons }: { reasons: Reason[] }) => {
  return (
    <UnorderedList>
      {reasons.map((reason, i) => (
        <ReasonListItem key={`${reason.content}.${i}`} reason={reason} />
      ))}
    </UnorderedList>
  );
});
ReasonsList.displayName = 'ReasonsList';

const ReasonListItem = memo(({ reason }: { reason: Reason }) => {
  return (
    <ListItem>
      <span>
        {reason.prefix && (
          <Text as="span" fontWeight="semibold">
            {reason.prefix}:{' '}
          </Text>
        )}
        <Text as="span">{reason.content}</Text>
      </span>
    </ListItem>
  );
});
ReasonListItem.displayName = 'ReasonListItem';

const StyledDivider = memo(() => <Divider opacity={0.2} borderColor="base.900" />);
StyledDivider.displayName = 'StyledDivider';

const AddingToText = memo(() => {
  const { t } = useTranslation();
  const autoAddBoardId = useAppSelector(selectAutoAddBoardId);
  const autoAddBoardName = useBoardName(autoAddBoardId);

  return (
    <Text fontStyle="oblique 10deg">
      {t('parameters.invoke.addingImagesTo')}{' '}
      <Text as="span" fontWeight="semibold">
        {autoAddBoardName || t('boards.uncategorized')}
      </Text>
    </Text>
  );
});
AddingToText.displayName = 'AddingToText';
