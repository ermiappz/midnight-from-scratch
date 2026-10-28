// Select the network used by SDK serialization and operations.
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

// This fixture uses a PUBLIC genesis seed and must stay on a local devnet.
export const networkId = 'undeployed';
// Select the network before constructing SDK objects that depend on it.
setNetworkId(networkId);
// Keep the local service addresses together so providers agree on their destinations.
export const endpoints = {
  // Query confirmed public data through the indexer's HTTP endpoint.
  indexer: 'http://127.0.0.1:8088/api/v4/graphql',
  // Subscribe to indexed updates through the WebSocket endpoint.
  indexerWS: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
  // Connect transaction submission to the local node.
  nodeWS: 'ws://127.0.0.1:9944',
  // Point proof requests at the local proof server.
  proof: 'http://127.0.0.1:6300',
};
