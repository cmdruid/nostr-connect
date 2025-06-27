export interface PermissionPolicy {
  methods : Record<string, boolean>
  kinds   : Record<number, boolean>
}
