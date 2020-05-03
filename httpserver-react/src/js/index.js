import store from "../js/store/index"; // dev
import { refreshDir, setBaseDir } from "../js/actions/index";

window.store = store;
window.refreshDir = refreshDir;
window.setBaseDir = setBaseDir;