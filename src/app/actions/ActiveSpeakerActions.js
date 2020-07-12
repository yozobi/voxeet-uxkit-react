import VoxeetSDK from "@voxeet/voxeet-web-sdk";

export const Types = {
  START_ACTIVE_SPEAKER: "START_ACTIVE_SPEAKER",
  STOP_ACTIVE_SPEAKER: "STOP_ACTIVE_SPEAKER",
  PARTICIPANT_SPEAKING: "PARTICIPANT_SPEAKING",
  PENDING_PARTICIPANT_SPEAKING: "PENDING_PARTICIPANT_SPEAKING",
  DISABLE_FORCE_ACTIVE_SPEAKER: "DISABLE_FORCE_ACTIVE_SPEAKER",
  FORCE_ACTIVE_SPEAKER: "FORCE_ACTIVE_SPEAKER",
};
const NEXT_ACTIVE_SPEAKER_DEFAULT_CNT = 3;

export class Actions {
  static startActiveSpeaker() {
    return (dispatch, getState) => {
      const {
        voxeet: { participants },
      } = getState();
      let interval = participants.interval;
      if (!interval) {
        interval = setInterval(() => {
          const {
            voxeet: { participants, activeSpeaker },
          } = getState();
          if (participants.screenShareEnabled) return;
          if (!activeSpeaker.forceActiveUserEnabled) {
            for (let participant of participants.participants) {
              if (participant.participant_id)
                VoxeetSDK.conference.isSpeaking(
                  VoxeetSDK.conference.participants.get(
                    participant.participant_id
                  ),
                  (status) => {
                    participant.isSpeaking = status;
                  }
                );
            }
            const participantsConnected = participants.participants.filter(
              (p) => p.isConnected
            );
            const participant =
              participantsConnected.length === 1
                ? participantsConnected[0]
                : participants.participants.find((p) => p.isSpeaking) ||
                  null;
            let nextActiveSpeaker = activeSpeaker.nextActiveSpeaker,
                nextActiveSpeakerCnt = activeSpeaker.nextActiveSpeakerCnt;
            if(participant) {
              // Set new AS if there is none
              if(!activeSpeaker.activeSpeaker ) {
                // console.log('Setting the first active speaker');
                dispatch({
                  type: Types.PARTICIPANT_SPEAKING,
                  payload: { participant },
                });
                dispatch(this.pendingActiveSpeaker(null, NEXT_ACTIVE_SPEAKER_DEFAULT_CNT))
              }
              // Clear next AS if participant == active speaker
              else if(activeSpeaker.activeSpeaker != participant && nextActiveSpeaker != participant) {
                // console.log('Pending new active speaker', NEXT_ACTIVE_SPEAKER_DEFAULT_CNT);
                dispatch(this.pendingActiveSpeaker(participant, NEXT_ACTIVE_SPEAKER_DEFAULT_CNT))
              }
              // Clear next AS if participant == active speaker
              else if(activeSpeaker.activeSpeaker == participant) {
                if(nextActiveSpeaker) {
                  // console.log('Removing next active speaker');
                  dispatch(this.pendingActiveSpeaker(null, NEXT_ACTIVE_SPEAKER_DEFAULT_CNT))
                }
              }
              // Decrease next AS cnt if next AS didnt change
              else if(nextActiveSpeaker == participant) {
                nextActiveSpeakerCnt--;
                if(nextActiveSpeakerCnt>0) {
                  // console.log('Upgrading next active speaker', nextActiveSpeakerCnt);
                  dispatch(this.pendingActiveSpeaker(participant, nextActiveSpeakerCnt))
                } else {
                  // Set new active speaker if  next AS cnt drops to 0
                  // console.log('Setting new active speaker', participant);
                  dispatch({
                    type: Types.PARTICIPANT_SPEAKING,
                    payload: { participant },
                  });
                  dispatch(this.pendingActiveSpeaker(null, NEXT_ACTIVE_SPEAKER_DEFAULT_CNT))
                }
              }
            } // else {
              // console.log('No speakers');
            // }
          }
        }, 500);
      }

      dispatch({
        type: Types.START_ACTIVE_SPEAKER,
        payload: {
          interval,
        },
      });
    };
  }

  static stopActiveSpeaker() {
    return {
      type: Types.STOP_ACTIVE_SPEAKER,
    };
  }

  static pendingActiveSpeaker(participant, weight) {
    return {
      type: Types.PENDING_PARTICIPANT_SPEAKING,
      payload: { participant, weight },
    };
  }

  static disableForceActiveSpeaker() {
    return {
      type: Types.DISABLE_FORCE_ACTIVE_SPEAKER,
    };
  }

  static forceActiveSpeaker(participant) {
    return {
      type: Types.FORCE_ACTIVE_SPEAKER,
      payload: { participant },
    };
  }
}
