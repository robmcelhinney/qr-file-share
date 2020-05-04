import { REFRESH_DIR, SET_REL_DIR } from "../constants/action-types";

const initialState = {
    files: {"loading": ""},
    relDir: "/"
};
  
function rootReducer(state = initialState, action) {
    if (action.type === REFRESH_DIR) {
        return Object.assign({}, state, {
            files: action.payload
          });
    }
    if (action.type === SET_REL_DIR) {
        return Object.assign({}, state, {
            relDir: action.payload
          });
    }
    return state;
};

export default rootReducer;