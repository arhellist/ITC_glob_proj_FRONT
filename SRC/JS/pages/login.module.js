import {
  login,
  registration,
  getUser,
  getIsAuth,
  setIsCaptcha,
  getIsCaptcha,
} from "../auth/store/store.js";
import { getCSRF } from "../auth/services/AuthService.js";
import { closeMenu, cleanRoot, clearDOMPurify, setCaptcha } from "../utils.js";
import {
  ErrorNotification,
  SuccessNotification,
  AttentionNotification,
} from "../notifications.js";
import { PersonalRoom } from "./personalRoom.module.js";
const notification_container = document.querySelector(
  ".notification_container"
);

export default async function Login(root) {
  const csrfToken = await getCSRF();

  const insertLogin = () => {
    const template = `
          <div class="login-container-blur flex bru">
              <div class="login-container flex flex-column bru">
              <div class="radio flex flex-row">
                <input label="REG" type="radio" id="reg" name="sign" value="reg"  bru>
                <input label="LOGIN" type="radio" id="login" name="sign" value="login" checked bru>
              </div>
                  <h1 class="login-title">Login</h1>
              <div class="login-container-body flex flex-column">

                  <input type="text" placeholder="Фамилия" class="surname-input bru" required>
                  <input type="text" placeholder="Имя" class="name-input bru" required>
                  <input type="text" placeholder="Отчество" class="patronymic-input bru" required>

                  <input type="tel" placeholder="Телефон" class="phone-input bru" required>

                  <input type="email" placeholder="Электропочта" class="email-input bru" required>
                  <input type="password" placeholder="Пароль" class="password-input bru" required>
                  <input type="password" placeholder="Повторите пароль" class="repeat-password-input bru" required>

                  <input type="hidden" name="captchaVerified" id="captchaVerified" value="0">

                  <button class="login-button bru login-login">Login</button>
                  <button class="login-button bru login-register">Registration</button>

              </div>
            </div>
          </div>
`;
    const clean = clearDOMPurify(template);
    root.insertAdjacentHTML("beforeend", clean);
  };
  cleanRoot(root); //  очищаем root перед вставкой формы Аутентификации
  insertLogin(); // вставка формы Аутентификации

  const loginContainer = document.querySelector(".login-container");

  const loginButton = document.querySelector(".login-login");
  const register = document.querySelector(".login-register");

  const regBut = document.querySelector("#reg");
  const loginBut = document.querySelector("#login");

  document.querySelector(".login-login").style.display = "block"; //показывает кнопку входа
  document.querySelector(".login-register").style.display = "none"; //скрывает кнопку регистрации
  document.querySelector(".name-input").style.display = "none"; //скрывает инпут имени
  document.querySelector(".surname-input").style.display = "none"; //скрывает инпут фамилии
  document.querySelector(".patronymic-input").style.display = "none"; //скрывает инпут отчества
  document.querySelector(".phone-input").style.display = "none"; //скрывает инпут телефона
  document.querySelector(".repeat-password-input").style.display = "none"; //скрывает инпут повторения пароля

  regBut.addEventListener("change", () => {
    //меню регистрации
    if (regBut.checked) {
console.log(`getIsCaptcha()`);console.log(getIsCaptcha());

      if (!getIsCaptcha()) {
        setCaptcha(loginContainer); // установка капчи
        document.querySelector(".captcha-container").style.display = "block";
      }
      document.querySelector(".login-title").textContent = "Registration"; //меняет текст заголовка на "Registration"

      document.querySelector(".login-login").style.display = "none"; //скрывает кнопку регистрации
      document.querySelector(".login-register").style.display = "block"; //показывает кнопку входа

      document.querySelector(".name-input").style.display = "block"; //показывает инпут имени
      document.querySelector(".surname-input").style.display = "block"; //показывает инпут фамилии
      document.querySelector(".patronymic-input").style.display = "block"; //показывает инпут отчества
      document.querySelector(".phone-input").style.display = "block"; //показывает инпут телефона
      document.querySelector(".repeat-password-input").style.display = "block"; //показывает инпут повторения пароля
    }
  });

  loginBut.addEventListener("change", () => {
    //меню входа
    if (loginBut.checked) {
      document.querySelector(".captcha-container").style.display = "none";
      document.querySelector(".login-title").textContent = "Login"; //меняет текст заголовка на "Login"
      document.querySelector(".login-login").style.display = "block"; //показывает кнопку входа
      document.querySelector(".login-register").style.display = "none"; //скрывает кнопку регистрации

      document.querySelector(".name-input").style.display = "none"; //скрывает инпут имени
      document.querySelector(".surname-input").style.display = "none"; //скрывает инпут фамилии
      document.querySelector(".patronymic-input").style.display = "none"; //скрывает инпут отчества
      document.querySelector(".phone-input").style.display = "none"; //скрывает инпут телефона
      document.querySelector(".repeat-password-input").style.display = "none"; //скрывает инпут повторения пароля


     if(document.querySelector(".captcha-container"))  {
      document.querySelector(".captcha-container").style.display = "none";
     } 
   
    }
  });

  // Обработка фокуса на INPUT:
  //если фокус на инпуте, то добавляется класс эффкт BLUR пропадает
  document
    .querySelector(".email-input")
    .addEventListener("focus", () =>
      document
        .querySelector(".login-container-blur")
        .classList.add("inputFocus")
    );
  document
    .querySelector(".email-input")
    .addEventListener("blur", () =>
      document
        .querySelector(".login-container-blur")
        .classList.remove("inputFocus")
    );
  document
    .querySelector(".password-input")
    .addEventListener("focus", () =>
      document
        .querySelector(".login-container-blur")
        .classList.add("inputFocus")
    );
  document
    .querySelector(".password-input")
    .addEventListener("blur", () =>
      document
        .querySelector(".login-container-blur")
        .classList.remove("inputFocus")
    );

  // обработка кнопки входа
  loginButton.addEventListener("click", async (event) => {
    event.preventDefault();
    loginButton.disabled = true;

    try {
      const email = document.querySelector(".email-input").value;
      const password = document.querySelector(".password-input").value;

      console.log("Login form submitted:", { email });

      const result = await login(email, password);

      console.log("Login result:", {
        success: !!result,
        hasToken: !!result?.data?.token,
      });

      const user = getUser();
      console.log(`user============================================>`);
      console.log(user);

      const isAuth = getIsAuth();
      console.log(`isAuth============================================>`);
      console.log(isAuth);

      if (isAuth) {
        document.querySelector(".login-container-blur").style.position =
          "absolute";
        SuccessNotification(
          notification_container,
          `Вы успешно авторизовались`
        );
        await PersonalRoom(root);

        if (!getUser().isActivated) {
          // если аккаунт не активирован, то показывается уведомление
          AttentionNotification(
            notification_container,
            "Активируйте ваш аккаунт"
          );
        }
      }
    } catch (error) {
      console.error("Login form error:", {
        message: error.message,
        response: error.response?.data,
      });
      ErrorNotification(notification_container, "Ошибка аутентификации");
    } finally {
      loginButton.disabled = false;
    }
  });

  // обработка кнопки регистрации
  register.addEventListener("click", async (event) => {
    event.preventDefault();

    register.disabled = true;
    register.textContent = "Регистрация...";

    try {
      const email = document.querySelector(".email-input")?.value;
      const password = document.querySelector(".password-input")?.value;
      const name = document.querySelector(".name-input")?.value;
      const surname = document.querySelector(".surname-input")?.value;
      const patronymic = document.querySelector(".patronymic-input")?.value;
      const phone = document.querySelector(".phone-input")?.value;
      const repeatPassword = document.querySelector(".repeat-password-input")?.value;
      console.log(`getIsCaptcha() при регистрации`);console.log(getIsCaptcha());
      const captcha = getIsCaptcha();

      if(!captcha){
        ErrorNotification(notification_container, "Капча не пройдена");
        return;
      }
      if (
        email &&
        password &&
        name &&
        surname &&
        patronymic &&
        phone &&
        repeatPassword &&
        captcha
      ) {
        console.log("Попытка регистрации...");
        if (password !== repeatPassword) {
          ErrorNotification(notification_container, "Пароли не совпадают");
          return;
        }

        await registration(email, password, name, surname, patronymic, phone, captcha);

        const user = getUser();
        console.log(`user============================================>`);
        console.log(user);

        const isAuth = getIsAuth();
        console.log(`isAuth============================================>`);
        console.log(isAuth);

        if (isAuth) {
          document.querySelector(".login-container-blur").style.position =
            "absolute";
          SuccessNotification(
            notification_container,
            `Вы успешно зарегистрировались`
          );
          PersonalRoom(root);

          if (!getUser().isActivated) {
            AttentionNotification(
              notification_container,
              "Активируйте ваш аккаунт"
            );
          }
        }
      } else {
        console.log("Поля не заполнены");
        ErrorNotification(notification_container, "Заполните все поля");
      }
    } catch (error) {
      console.error("Ошибка при регистрации:", error.message);
      ErrorNotification(notification_container, "Ошибка регистрации");
    } finally {
      register.disabled = false;
      register.textContent = "Registration";
    }
  });
}
