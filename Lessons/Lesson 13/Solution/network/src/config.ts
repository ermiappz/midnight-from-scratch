// Select one network before creating any serialization-dependent SDK objects.
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
// Restrict configuration to the four supported network IDs.
export type CourseNetwork = 'undeployed' | 'preview' | 'preprod' | 'mainnet';
// Preserve the local default used by lesson 13; public stages choose explicitly.
const selected = process.env.MIDNIGHT_NETWORK ?? 'undeployed';
if (!['undeployed', 'preview', 'preprod', 'mainnet'].includes(selected)) throw new Error('MIDNIGHT_NETWORK must be undeployed, preview, preprod, or mainnet');
export const networkId = selected as CourseNetwork;
setNetworkId(networkId);
// Keep service URLs for the same network together; never log authenticated URLs.
function configuredEndpoints() {
  // The local bundle uses public test keys and loopback services.
  if (networkId === 'undeployed') return {
    indexer: 'http://127.0.0.1:8088/api/v4/graphql',
    indexerWS: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
    nodeWS: 'ws://127.0.0.1:9944', proof: 'http://127.0.0.1:6300',
  };
  // Preview is the unauthenticated shared experimentation network.
  if (networkId === 'preview') return {
    indexer: 'https://indexer.preview.midnight.network/api/v4/graphql',
    indexerWS: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
    nodeWS: 'wss://rpc.preview.midnight.network', proof: 'http://127.0.0.1:6300',
  };
  // Preprod and mainnet use a project token for their respective Blockfrost network.
  const token = process.env.BLOCKFROST_PROJECT_ID;
  if (!token?.trim()) throw new Error(`Set BLOCKFROST_PROJECT_ID for ${networkId}; keep it out of browser bundles and logs`);
  const withToken = (url: string) => {
    const result = new URL(url);
    result.searchParams.set('project_id', token);
    return result.toString();
  };
  return {
    indexer: withToken(`https://midnight-${networkId}.blockfrost.io/api/v0`),
    indexerWS: withToken(`wss://midnight-${networkId}.blockfrost.io/api/v0/ws`),
    nodeWS: withToken(`wss://rpc.midnight-${networkId}.blockfrost.io`),
    proof: 'http://127.0.0.1:6300',
  };
}
// A prover remains local even when the node and indexer are public services.
export const endpoints = configuredEndpoints();
