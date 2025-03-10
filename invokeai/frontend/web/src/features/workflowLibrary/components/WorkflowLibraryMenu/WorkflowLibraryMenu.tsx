import {
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuList,
  useDisclosure,
  useGlobalMenuClose,
} from '@invoke-ai/ui';
import { useFeatureStatus } from 'features/system/hooks/useFeatureStatus';
import DownloadWorkflowMenuItem from 'features/workflowLibrary/components/WorkflowLibraryMenu/DownloadWorkflowMenuItem';
import NewWorkflowMenuItem from 'features/workflowLibrary/components/WorkflowLibraryMenu/NewWorkflowMenuItem';
import SaveWorkflowAsMenuItem from 'features/workflowLibrary/components/WorkflowLibraryMenu/SaveWorkflowAsMenuItem';
import SaveWorkflowMenuItem from 'features/workflowLibrary/components/WorkflowLibraryMenu/SaveWorkflowMenuItem';
import SettingsMenuItem from 'features/workflowLibrary/components/WorkflowLibraryMenu/SettingsMenuItem';
import UploadWorkflowMenuItem from 'features/workflowLibrary/components/WorkflowLibraryMenu/UploadWorkflowMenuItem';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { PiDotsThreeOutlineFill } from 'react-icons/pi';

const WorkflowLibraryMenu = () => {
  const { t } = useTranslation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  useGlobalMenuClose(onClose);

  const isWorkflowLibraryEnabled =
    useFeatureStatus('workflowLibrary').isFeatureEnabled;

  return (
    <Menu isOpen={isOpen} onOpen={onOpen} onClose={onClose}>
      <MenuButton
        as={IconButton}
        aria-label={t('workflows.workflowEditorMenu')}
        icon={<PiDotsThreeOutlineFill />}
        pointerEvents="auto"
      />
      <MenuList pointerEvents="auto">
        {isWorkflowLibraryEnabled && <SaveWorkflowMenuItem />}
        {isWorkflowLibraryEnabled && <SaveWorkflowAsMenuItem />}
        <DownloadWorkflowMenuItem />
        <UploadWorkflowMenuItem />
        <NewWorkflowMenuItem />
        <MenuDivider />
        <SettingsMenuItem />
      </MenuList>
    </Menu>
  );
};

export default memo(WorkflowLibraryMenu);
