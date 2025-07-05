//Хранилище состояний
import {
  login,
  registration,
  logout,
  getUser,
  getIsAuth,
} from "../auth/store/store.js";
// Утилиты
import {
  closeMenu,
  cleanRoot,
  clearDOMPurify,
} from "../utils.js";
// Страницы
import Login from "../pages/login.module.js";

// Уведомления
import {
  ErrorNotification,
  SuccessNotification,
  AttentionNotification,
  InfoNotification,
  PostNotification,
  MessageNotification,
} from "../notifications.js";
// Админка
import insertAdminPanel from "./ADMIN_MODULES/adminPanel.js";

import { insertUserProfileMenu } from "./USER_MODULES/user-controller.js";

const notification_container = document.querySelector(
  ".notification_container"
);

export async function PersonalRoom(root) {
  const template = `
      <div class="personal-room-container flex flex-column">
        <div class="personal-room-header flex flex-row">
          <h1>Личный кабинет</h1>
          <span class="personal-room-span">${getUser().surname} ${
    getUser().firstname
  } ${getUser().patronymic}</span>
          <button class="personal-room-button bru">Выйти</button>
        </div>

        <div class="personal-room-body flex flex-row">
        <nav class="personal-room-nav flex flex-column">
          <ul class="personal-room-nav-list flex flex-column">
            <li class="personal-room-nav-item flex flex-row bru profile">
              <a href="#" class="personal-room-nav-link">Профиль</a>
            </li>
            <li class="personal-room-nav-item flex flex-row bru partners">
              <a href="#" class="personal-room-nav-link">Партнеры</a>
            </li>
            <li class="personal-room-nav-item flex flex-row bru accounts">
              <a href="#" class="personal-room-nav-link">Счета</a>
            </li>
            <li class="personal-room-nav-item flex flex-row bru transactions">
              <a href="#" class="personal-room-nav-link">Транзакции</a>
            </li>
            <li class="personal-room-nav-item flex flex-row bru reports">
              <a href="#" class="personal-room-nav-link">Отчеты</a>
            </li>
            <li class="personal-room-nav-item flex flex-row bru documents">
              <a href="#" class="personal-room-nav-link">Документы KYC</a>
            </li>
            <li class="personal-room-nav-item flex flex-row bru messages">
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
  const personalRoomContent = document.querySelector(".personal-room-content");

  exitButton.addEventListener("click", () => {
    logout();
    Login(root); // перед вставкой логин-окна идет очищение контегта в ROOT
  });

  const userProfileMenu = document.querySelector(".profile");
  const partners = document.querySelector(".partners");
  const accounts = document.querySelector(".accounts");
  const reports = document.querySelector(".reports");
  const documents = document.querySelector(".documents");
  const messages = document.querySelector(".messages");

  userProfileMenu.addEventListener(`click`, async () => {
    cleanRoot(personalRoomContent); // очистка контентной области
    insertUserProfileMenu(personalRoomContent); // вставка меню "ПРОФИЛЬ"
  });

  // ИНЖЕКТИРОВАНИЕ АДМИНИСТРАТИВНОГО МЕНЮ
  // Если пользователь является {администратором, владельцем, ROOT-пользователем}, то в меню будет добавлена ссылка на админку
  if (
    getUser().statusPerson === `admin` ||
    getUser().statusPerson === `owner` ||
    getUser().statusPerson === `root`
  ) {
    const templateAdmin = `
    <li class="personal-room-nav-item flex flex-row bru admin">
      <a href="#" class="personal-room-nav-link">Админка</a>
    </li>
  `;
    const cleanAdmin = clearDOMPurify(templateAdmin);
    personalRoomNavList.insertAdjacentHTML("beforeend", cleanAdmin);

    const admin = document.querySelector(".admin");

    admin.addEventListener("click", async () => {
      cleanRoot(personalRoomContent);
      insertAdminPanel(personalRoomContent);
    });
  }
}
