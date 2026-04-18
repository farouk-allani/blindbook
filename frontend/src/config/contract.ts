export const BLINDBOOK_ADDRESS = '0x9f63726454c6571955b0c17300ace7f9fb5C3F36' as const

export const BLINDBOOK_ABI = [
  {
    inputs: [
      { name: 'side', type: 'uint8' },
      {
        name: 'amount',
        type: 'tuple',
        components: [
          { name: 'ctHash', type: 'uint256' },
          { name: 'securityZone', type: 'uint8' },
          { name: 'utype', type: 'uint8' },
          { name: 'signature', type: 'bytes' },
        ],
      },
      {
        name: 'price',
        type: 'tuple',
        components: [
          { name: 'ctHash', type: 'uint256' },
          { name: 'securityZone', type: 'uint8' },
          { name: 'utype', type: 'uint8' },
          { name: 'signature', type: 'bytes' },
        ],
      },
    ],
    name: 'submitOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'buyOrderId', type: 'uint256' },
      { name: 'sellOrderId', type: 'uint256' },
    ],
    name: 'matchOrders',
    outputs: [{ name: 'matchId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'matchId', type: 'uint256' },
      { name: 'fillQty', type: 'uint64' },
    ],
    name: 'revealFill',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'cancelOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'getOrderInfo',
    outputs: [
      { name: 'trader', type: 'address' },
      { name: 'side', type: 'uint8' },
      { name: 'status', type: 'uint8' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'getOrderAmount',
    outputs: [{ name: '', type: 'uint64' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'getOrderPrice',
    outputs: [{ name: '', type: 'uint64' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'matchId', type: 'uint256' }],
    name: 'getMatchFillQty',
    outputs: [{ name: '', type: 'uint64' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalOrders',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalMatches',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'uint256' }],
    name: 'fills',
    outputs: [
      { name: 'fillQty', type: 'uint64' },
      { name: 'matched', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: true, name: 'trader', type: 'address' },
      { indexed: false, name: 'side', type: 'uint8' },
    ],
    name: 'OrderSubmitted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'matchId', type: 'uint256' },
      { indexed: true, name: 'buyOrderId', type: 'uint256' },
      { indexed: true, name: 'sellOrderId', type: 'uint256' },
    ],
    name: 'OrdersMatched',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'fillQty', type: 'uint64' },
      { indexed: false, name: 'matched', type: 'bool' },
    ],
    name: 'FillRevealed',
    type: 'event',
  },
] as const
