// import Login from "../../MODULES/pages/login.module.js" // Удален - используем React компоненты
import { closeMenu, openMenu, getAuth ,cleanRoot, getAllQueryParams} from "../../MODULES/utils.js";
import {PersonalRoom} from "../../MODULES/pages/personalRoom.module.js";
export const initApp = async (root) => {
    const searchAuth = await getAuth(); // проверка на Авторизацию
    console.log(`searchAuth`);console.log(searchAuth)
    if (!searchAuth.isAuth) {
      
      Login(root); // перед вставкой логин-окна идет очищение контегта в ROOT
    } else if (searchAuth.isAuth) {
      PersonalRoom(root);
    }
  };

