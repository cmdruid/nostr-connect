import { Buff }      from "@cmdcode/buff"
import { NostrNode } from '@cmdcode/nip46-sdk'

import type { NodeConfig } from '@cmdcode/nip46-sdk'

export function generate_nodes (
  names   : string[],
  relays  : string[],
  options : Partial<NodeConfig> = {}
) : Map<string, NostrNode> {
  return new Map(names.map(name => {
    const seckey = Buff.str(name).digest.hex
    const relay  = new NostrNode(relays, seckey, options)
    return [ name, relay ]
  }))
}

export function get_node (
  nodes : Map<string, NostrNode>, 
  name  : string
) : NostrNode {
  const node = nodes.get(name)
  if (node === undefined) {
    throw new Error(`Node ${name} not found`)
  }
  return node
}

export function get_peers (
  nodes : Map<string, NostrNode>,
  name  : string
) : string[] {
  return Array.from(nodes.entries())
    .filter(([ key ]) => key !== name)
    .map(([ _, node ]) => node.pubkey)
}
