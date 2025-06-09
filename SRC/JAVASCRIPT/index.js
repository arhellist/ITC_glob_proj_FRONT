import Login from "./MODULES/pages/login.module.js"
import { checkAuth, login, registration, logout, getUser, getIsAuth } from "./MODULES/auth/store/store.js";
import { closeMenu, openMenu } from "./MODULES/utils.js";

export const root = document.querySelector('.root')

// Функция для инициализации приложения
async function initApp() {
    console.log('=== Инициализация приложения ===');
    
    // Проверяем, что функции импортированы корректно
    console.log('checkAuth функция:', typeof checkAuth);
    console.log('login функция:', typeof login);
    console.log('getUser функция:', typeof getUser);
    
    try {
        // Проверяем авторизацию
        console.log('Вызываем checkAuth...');
        
        // Сначала попробуем простую проверку без таймаута
        const isAuth = await checkAuth();
        
        console.log('checkAuth завершился, результат:', isAuth);
        console.log('Статус авторизации:', isAuth ? 'авторизован' : 'не авторизован');

        if (isAuth) {
            console.log('Сессия активна, пользователь авторизован');
            // Здесь можно добавить загрузку защищенных данных
            // Например, загрузку профиля пользователя
            console.log('Данные пользователя:', getUser());
            
            // Закрываем меню логина, если оно открыто
            closeMenu(root);
            
            // Здесь можно добавить инициализацию защищенного контента
            // Например, загрузку основного интерфейса приложения
        } else {
            console.log('Сессия неактивна, требуется вход');
            // Показываем форму входа
            Login(root);
            
            // Добавляем обработчики для формы входа
            setupLoginHandlers();
        }
    } catch (error) {
        console.error('Ошибка при инициализации приложения:', error);
        console.error('Тип ошибки:', error.constructor.name);
        console.error('Сообщение ошибки:', error.message);
        console.error('Стек ошибки:', error.stack);
        
        // В случае ошибки показываем форму входа
        Login(root);
        setupLoginHandlers();
    }
}

// Функция для настройки обработчиков формы входа
function setupLoginHandlers() {
    const submit = document.querySelector(".login-submit"); // кнопка входа
    const register = document.querySelector(".login-register"); // кнопка регистрации
    
    if (!submit || !register) {
        console.error('Элементы формы входа не найдены');
        return;
    }
    
    // обработка кнопки входа
    submit.addEventListener("click", async () => {
        const email = document.querySelector(".email-input")?.value;
        const password = document.querySelector(".password-input")?.value;
    
        if (email && password) {
            console.log('Попытка входа...');
            try {
                await login(email, password);
                console.log("Вы успешно вошли в систему");
                closeMenu(root);
                // Перезагружаем приложение для инициализации защищенного контента
                initApp();
            } catch (error) {
                console.log("Не удалось войти в систему");
                // Здесь можно добавить отображение ошибки пользователю
            }
        } else {
            console.log("Поля не заполнены");
            // Здесь можно добавить отображение ошибки пользователю
        }
    });
    
    // обработка кнопки регистрации
    register.addEventListener("click", async () => {
        const email = document.querySelector(".email-input")?.value;
        const password = document.querySelector(".password-input")?.value;
    
        if (email && password) {
            console.log('Попытка регистрации...');
            try {
                await registration(email, password);
                console.log("Вы успешно зарегистрировались в системе");
                closeMenu(root);
                // Перезагружаем приложение для инициализации защищенного контента
                initApp();
            } catch (error) {
                console.log("Не удалось зарегистрироваться в системе");
                // Здесь можно добавить отображение ошибки пользователю
            }
        } else {
            console.log("Поля не заполнены");
            // Здесь можно добавить отображение ошибки пользователю
        }
    });
}

// Запускаем инициализацию приложения
initApp();