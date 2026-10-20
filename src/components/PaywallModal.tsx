import React from 'react';
import { GrowthCheckpointModal, GrowthCheckpointModalProps } from './GrowthCheckpointModal';

export interface PaywallModalProps extends GrowthCheckpointModalProps {
  onRestore?: () => Promise<void> | void;
}

/**
 * PaywallModal legacy adapter: Re-exports GrowthCheckpointModal under the new
 * 'Growth Checkpoint' and 'Axiom Wealth Apex' branding.
 */
export const PaywallModal: React.FC<PaywallModalProps> = (props) => {
  return <GrowthCheckpointModal {...props} />;
};

export { GrowthCheckpointModal };
