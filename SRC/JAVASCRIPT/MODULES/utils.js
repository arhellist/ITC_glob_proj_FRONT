import DOMPurify from "dompurify";
import { checkAuth, login, registration, logout, getUser, getIsAuth  } from "./auth/store/store";

export const reCaptchaKeyAPI = `0x4AAAAAABhPbLKOR0CTGSnV`
// Очистка ROOT элемента
export const cleanRoot = (root) =>{
  const children = root.children;
  if (children.length > 0) {
    Array.from(children).forEach((child) => {
      child.classList.add("blur-active");

      setTimeout(() => {
        child.remove();
      }, 400);
    });
  } else {
    console.log(`root пустой, удалять нечего`)
  }
}
// функция закрытия меню
export const closeMenu = (root) => {
  if (root.classList.contains("blur-blur")) {
    root.classList.remove("blur-blur");
    root.classList.add("blur-active");

    const children = root.children;

    if (children.length > 0) {
      Array.from(children).forEach((child) => {
        child.classList.add("blur-active");

        setTimeout(() => {
          child.remove();
        }, 400);
      });
    }
  } else if (
    !root.classList.contains("blur-active") &&
    !root.classList.contains("blur-blur")
  ) {
    root.classList.add("blur-active");

    const children = root.children;

    if (children.length > 0) {
      Array.from(children).forEach((child) => {
        child.classList.add("blur-active");

        setTimeout(() => {
          child.remove();
        }, 400);
      });
    }
  }
};

// функция открытия меню
export const openMenu = (root) => {
  if (root.classList.contains("blur-active")) {
    root.classList.remove("blur-active");
    root.classList.add("blur-blur");
  } else if (
    !root.classList.contains("blur-blur") &&
    !root.classList.contains("blur-active")
  ) {
    root.classList.add("blur-blur");
  } else {
    console.log(`Ничего не произошло при открытии окна. Нет допустимых условий`);
  }
};

// Санитизация контегта
export const clearDOMPurify = (template) => {
  const clean = DOMPurify.sanitize(template, {
    ADD_ATTR: ["target", "class"], // Разрешенные дополнительные атрибуты
    ADD_TAGS: ["iframe"], // Разрешенные дополнительные теги
    FORBID_TAGS: ["style", "iframe"], // Запрещенные теги
    FORBID_ATTR: ["style", "onerror", "onclick", "form"], // Запрещенные атрибуты
    ALLOW_DATA_ATTR: true, // разрешение data-атрибутов
    SANITIZE_DOM: true, //дополнительная очистка DOM
    //RETURN_DOM: true,
  });
  return clean;
};

// Проверка авторизации
export const getAuth = async () => {
  console.log(`WELCOME getAuth`)
  try {
    await checkAuth();
  } catch (error) {
    console.error('Ошибка в checkAuth:', error.message);
  }
  
  const isAuth = getIsAuth();
  const user = getUser();
  
  return { isAuth, user };
};


// проверка QUERY параметров в запросе
export const getAllQueryParams = (url = window.location.href) => {
  const params = {};
  const searchParams = new URL(url).searchParams;
  
    // Проверка на наличие хотя бы одного параметра
    if (searchParams.toString().length === 0) {
      return null; // или return { isEmpty: true }
    }

  for (const [key, value] of searchParams.entries()) {
    if (params[key]) {
      params[key] = Array.isArray(params[key]) 
        ? [...params[key], value]
        : [params[key], value];
    } else {
      params[key] = value;
    }
  }
  
  return params;
}