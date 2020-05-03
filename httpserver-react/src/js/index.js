import store from "../js/store/index"; // dev
import { setFiles, setBaseDir } from "../js/actions/index";

window.store = store;
window.setFiles = setFiles;
window.setBaseDir = setBaseDir;