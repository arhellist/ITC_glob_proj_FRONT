import { initApp } from "./MODULES/controllers/initApp-controller.js";
import { parseParams } from "./MODULES/controllers/params-controller.js";
import { checkAuth, login, registration, logout, getUser, getIsAuth } from "./MODULES/auth/store/store.js";
import { closeMenu, openMenu, getAuth ,cleanRoot, getAllQueryParams} from "./MODULES/utils.js";


import { ErrorNotification, SuccessNotification, InfoNotification, AttentionNotification, PostNotification, MessageNotification } from "./MODULES/notifications.js";



const body = document.querySelector("body")
export const root = document.querySelector('.root')
const notification_container = document.querySelector(".notification_container")




export const origin = window.location.origin === `http://localhost:5173` ? `http://localhost:5173` : `https://arhellist.ru` 
console.log(`origin: ` + origin)

document.addEventListener(`DOMContentLoaded`, async()=>{
  
  
  //parseParams(queryParams, successMessage, errorMessage)
  parseParams()
  await initApp(root);

  ErrorNotification(notification_container,"ОШИБКА")
  SuccessNotification(notification_container,"УСПЕХ")
  InfoNotification(notification_container,"ИНФО")
  AttentionNotification(notification_container,"ВНИМАНИЕ")
  PostNotification(notification_container,"Вам пришло новое сообщение")
  MessageNotification(notification_container,"Вам пришло новое сообщение")

  PostNotification(notification_container,"Вам пришло новое сообщение")




})


