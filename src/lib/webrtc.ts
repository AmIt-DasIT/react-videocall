import SimplePeer from 'simple-peer';
import { encryptData, decryptData } from './encryption';

interface PeerConfig {
  initiator: boolean;
  stream: MediaStream;
  onSignal: (data: string) => void;
  onStream: (stream: MediaStream) => void;
  onError: (error: Error) => void;
}

export const createPeer = ({
  initiator,
  stream,
  onSignal,
  onStream,
  onError
}: PeerConfig): SimplePeer.Instance => {
  const peer = new SimplePeer({
    initiator,
    trickle: false,
    stream
  });

  peer.on('signal', (data) => {
    const encryptedSignal = encryptData(data);
    onSignal(encryptedSignal);
  });

  peer.on('stream', onStream);
  peer.on('error', onError);

  return peer;
};

export const handlePeerSignal = (
  peer: SimplePeer.Instance,
  encryptedSignal: string
): void => {
  const signal = decryptData(encryptedSignal);
  peer.signal(signal);
};