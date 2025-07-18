import { useNodeTemplateSafe } from 'features/nodes/hooks/useNodeTemplateSafe';
import type { PropsWithChildren, ReactNode } from 'react';
import { memo } from 'react';

// This component is used to gate the rendering of a component based on the existence of a template. It makes it
// easier to handle cases where we are missing a node template in the inspector.

export const TemplateGate = memo(
  ({ fallback, children }: PropsWithChildren<{ nodeId: string; fallback: ReactNode }>) => {
    const template = useNodeTemplateSafe();

    if (!template) {
      return fallback;
    }

    return <>{children}</>;
  }
);
TemplateGate.displayName = 'TemplateGate';
