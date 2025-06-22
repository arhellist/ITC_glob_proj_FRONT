import { login, registration, logout, getUser, getIsAuth } from "../auth/store/store.js";
import { closeMenu, cleanRoot, reCaptchaKeyAPI } from "../utils.js";
import Login from "../pages/login.module.js";
import { clearDOMPurify } from "../utils.js";
import {
  ErrorNotification,
  SuccessNotification,
  AttentionNotification,
  InfoNotification,
  PostNotification,
  MessageNotification,
} from "../notifications.js";

const notification_container = document.querySelector(
  ".notification_container"
);

export default async function PersonalRoom(root) {
    const template = `
      <div class="personal-room-container flex flex-column">
        <div class="personal-room-header flex flex-row">
          <h1>Личный кабинет</h1>
          <span class="personal-room-span">${getUser().surname} ${getUser().firstname} ${getUser().patronymic}</span>
          <button class="personal-room-button bru">Выйти</button>
        </div>

        <div class="personal-room-body flex flex-row">
        <nav class="personal-room-nav flex flex-column">
          <ul class="personal-room-nav-list flex flex-column">
            <li class="personal-room-nav-item flex flex-row bru">
              <a href="#" class="personal-room-nav-link">Профиль</a>
            </li>
            <li class="personal-room-nav-item flex flex-row bru">
              <a href="#" class="personal-room-nav-link">Партнеры</a>
            </li>
            <li class="personal-room-nav-item flex flex-row bru">
              <a href="#" class="personal-room-nav-link">Счета</a>
            </li>
            <li class="personal-room-nav-item flex flex-row bru">
              <a href="#" class="personal-room-nav-link">Отчеты</a>
            </li>
            <li class="personal-room-nav-item flex flex-row bru">
              <a href="#" class="personal-room-nav-link">Документы KYC</a>
            </li>
            <li class="personal-room-nav-item flex flex-row bru">
              <a href="#" class="personal-room-nav-link">Сообщения от компании</a>
            </li>
          </ul>
        </nav>

        <div class="personal-room-content flex flex-column">
          
        </div>
      </div>
    `;

    cleanRoot(root); //  очищаем root перед вставкой формы Аутентификации

    const clean = clearDOMPurify(template);
    root.insertAdjacentHTML("beforeend", clean);

const exitButton = document.querySelector(".personal-room-button");
const personalRoomNavList = document.querySelector(".personal-room-nav-list");

exitButton.addEventListener("click", () => {
  logout();
  Login(root); // перед вставкой логин-окна идет очищение контегта в ROOT

});

if (getUser().statusPerson === `admin` || getUser().statusPerson === `owner`|| getUser().statusPerson === `root`) {
    const templateAdmin = `
    <li class="personal-room-nav-item flex flex-row bru">
      <a href="#" class="personal-room-nav-link">Админка</a>
    </li>
  `;
  const cleanAdmin = clearDOMPurify(templateAdmin);
  personalRoomNavList.insertAdjacentHTML("beforeend", cleanAdmin);

}
}
