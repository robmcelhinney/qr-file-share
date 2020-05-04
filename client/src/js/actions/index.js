import { REFRESH_DIR, SET_REL_DIR } from "../constants/action-types"

export function setFiles(payload) {
  return { type: REFRESH_DIR, payload }
}
export function setRelDir(payload) {
  return { type: SET_REL_DIR, payload }
}