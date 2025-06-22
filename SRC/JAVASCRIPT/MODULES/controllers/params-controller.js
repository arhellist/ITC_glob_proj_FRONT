import {
  closeMenu,
  openMenu,
  getAuth,
  cleanRoot,
  getAllQueryParams,
} from "../../MODULES/utils.js";
import {
  ErrorNotification,
  SuccessNotification,
  InfoNotification,
  AttentionNotification,
  PostNotification,
  MessageNotification,
} from "../notifications.js";

import { activated } from "../services/params-service.js";

const notification_container = document.querySelector(
  ".notification_container"
);
export const parseParams = () => {
  const params = getAllQueryParams();
  console.log(`params`);
  console.log(params);
  if (!params) {
    console.log(`params пустой`);
    return null;
  }

  for (const [key, value] of Object.entries(params)) {
    console.log(`${key}: ${value}`);

    if (key === `activated`) {
      const result = activated(value);
      if (result) {
        console.log(`Вы успешно Активировались`);
        setTimeout(() => {
          SuccessNotification(
            notification_container,
            `Аккаунт успешно активирован`
          );
        }, 3000);
      } else {
        console.log(`Вы не Активировались`);
        setTimeout(() => {
          ErrorNotification(notification_container, `Вы не Активировались`);
        }, 3000);
      }
    }
  }
};
