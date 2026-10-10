import React from 'react';
import { Composition, type CalculateMetadataFunction } from 'remotion';
import { DEFAULT_CONFIG, normalizeConfig } from '../shared/config';
import { computeTimeline } from '../shared/timeline';
import { Invitation, type InvitationProps } from './Invitation';

export const COMPOSITION_ID = 'Invitation';

export const calculateInvitationMetadata: CalculateMetadataFunction<InvitationProps> = ({ props }) => {
  const config = normalizeConfig(props.config);
  const timeline = computeTimeline(config);
  return {
    durationInFrames: timeline.totalFrames,
    fps: config.fps,
    width: config.width,
    height: config.height,
    props: { config },
  };
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id={COMPOSITION_ID}
    component={Invitation}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={1350}
    defaultProps={{ config: DEFAULT_CONFIG }}
    calculateMetadata={calculateInvitationMetadata}
  />
);
