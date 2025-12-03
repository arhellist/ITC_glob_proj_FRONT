import { v4 as uuidv4 } from "uuid";

// Простая функция очистки HTML (альтернатива clearDOMPurify)
function clearDOMPurify(html) {
  // Базовая очистка HTML - удаляем потенциально опасные теги и атрибуты
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
}

export function ErrorNotification(root, text) {
  const id = uuidv4();
  const template = `
      <div class="notification error flex flex-row" data-id="${id}">
        <div class="error_icon notification_img img"></div>
        <div class="text">${text}</div>
      </div>`;

  const clean = clearDOMPurify(template);
  if (root) {
    root.insertAdjacentHTML("beforeend", clean);
  }
  const notification_msg = document.querySelector(`.error[data-id="${id}"]`);

  setTimeout(() => {
    if (notification_msg) {
      notification_msg.classList.add("remove_notification");
      setTimeout(() => {
        notification_msg.remove();
      }, 3500);
    }
  }, 3000);
}

export function SuccessNotification(root, text) {
  const id = uuidv4();
  const template = `
    <div class="notification success flex flex-row" data-id="${id}">
      <div class="success_icon notification_img img"></div>
      <div class="text">${text}</div>
    </div>`;

  const clean = clearDOMPurify(template);
  if (root) {
    root.insertAdjacentHTML("beforeend", clean);
  }
  const notification_msg = document.querySelector(`.success[data-id="${id}"]`);

  setTimeout(() => {
    if (notification_msg) {
      notification_msg.classList.add("remove_notification");
      setTimeout(() => {
        notification_msg.remove();
      }, 3500);
    }
  }, 3000);
}

export function AttentionNotification(root, text) {
  const id = uuidv4();
  const template = `
    <div class="notification attention flex flex-row" data-id="${id}">
      <div class="attention_icon notification_img img"></div>
      <div class="text">${text}</div>
    </div>`;

  const clean = clearDOMPurify(template);
  if (root) {
    root.insertAdjacentHTML("beforeend", clean);
  }
  const notification_msg = document.querySelector(
    `.attention[data-id="${id}"]`
  );

  setTimeout(() => {
    if (notification_msg) {
      notification_msg.classList.add("remove_notification");
      setTimeout(() => {
        notification_msg.remove();
      }, 3500);
    }
  }, 3000);
}

export function InfoNotification(root, text, id = uuidv4()) {
  const template = `
    <div class="notification click_notification info flex flex-row" data-id="${id}">
      <div class="info_icon notification_img img"></div>
      <div class="text">${text}</div>
    </div>`;

  const clean = clearDOMPurify(template);
  if (root) {
    root.insertAdjacentHTML("beforeend", clean);
  }

  const notification_msg = document.querySelector(`.info[data-id="${id}"]`);

  notification_msg.addEventListener("click", (e) => {
    if (e.target.closest(".info")) {
      e.target.closest(".info").classList.add("delete_notification");
      setTimeout(() => {
        notification_msg.remove();
      }, 2300);
    }
  });

  return id;
}

export function PostNotification(root, text, id = uuidv4()) {
  const template = `
    <div class="notification click_notification post flex flex-row" data-id="${id}">
      <div class="post_icon notification_img img"></div>
      <div class="text">${text}</div>
    </div>`;

  const clean = clearDOMPurify(template);
  if (root) {
    root.insertAdjacentHTML("beforeend", clean);
  }

  const notification_msg = document.querySelector(`.post[data-id="${id}"]`);

  notification_msg.addEventListener("click", (e) => {
    if (e.target.closest(".post")) {
      e.target.closest(".post").classList.add("delete_notification");
      setTimeout(() => {
        notification_msg.remove();
      }, 2300);
    }
  });

  return id;
}

export function MessageNotification(root, text, id = uuidv4()) {
  const template = `
    <div class="notification click_notification message flex flex-row" data-id="${id}">
      <div class="message_icon notification_img img"></div>
      <div class="text">${text}</div>
    </div>`;

  const clean = clearDOMPurify(template);
  if (root) {
    root.insertAdjacentHTML("beforeend", clean);
  }

  const notification_msg = document.querySelector(`.message[data-id="${id}"]`);

  notification_msg.addEventListener("click", (e) => {
    if (e.target.closest(".message")) {
      e.target.closest(".message").classList.add("delete_notification");
      setTimeout(() => {
        notification_msg.remove();
      }, 2300);
    }
  });

  return id;
}
