import { REFRESH_DIR, SET_BASE_DIR } from "../constants/action-types";

const initialState = {
    files: {"loading": ""},
    baseDir: "/"
};
  
function rootReducer(state = initialState, action) {
    if (action.type === REFRESH_DIR) {
        return Object.assign({}, state, {
            files: action.payload
          });
    }
    if (action.type === SET_BASE_DIR) {
        return Object.assign({}, state, {
            baseDir: action.payload
          });
    }
    return state;
};

export default rootReducer;