import Login from "./MODULES/pages/login.module.js"
import Store from "./MODULES/auth/store/store.js";
import { closeMenu, openMenu } from "./MODULES/utils.js";

const store = new Store();
export const root = document.querySelector('.root')

let check = await store.checkAuth()
console.log(`check`);console.log(check);


if (check) {
  console.log("Сессия активна");
  console.log(store.setUser);
} else {
  Login(root)


//=======================================================================================>

    const submit = document.querySelector(".login-submit"); // кнопка входа
    const register = document.querySelector(".login-register"); // кнопка регистрации
    
    // обработка кнопки входа
    submit.addEventListener("click", async () => {
      const email = document.querySelector(".email-input").value; // поле ввода email
      const password = document.querySelector(".password-input").value; // поле ввода пароля
    
      if (email && password) {
       await store.login(email, password); // вызов функции входа в систему
        if (store.isAuth) {
          console.log("Вы успешно вошли в систему");
          closeMenu(root);
          console.log(store.setUser);
        } else {
          console.log("Не удалось войти в систему");
        }
      } else {
        console.log("Поля не заполнены");
      }
    });
    
    
    // обработка кнопки регистрации
    register.addEventListener("click", async () => {
    
      const email = document.querySelector(".email-input").value; // поле ввода email
      const password = document.querySelector(".password-input").value; // поле ввода пароля
      
    
      if (email && password) {
       await store.registration(email, password);
        if (store.isAuth) { // если пользователь авторизован
          console.log("Вы успешно зарегистрировались в системе");
          closeMenu(root); // закрываем меню
        } else {
          console.log("Не удалось зарегистрироваться в системе");
        }
      } else {
        console.log("Поля не заполнены");
      }
    });
    //=======================================================================================>
  console.log("Сессия не активна требуется вход");
}



