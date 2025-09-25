import "./correct-user-data.css";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuthStore } from "../../../../JS/auth/store/store";

function CorrectUserData({ onClose }) {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  // Получаем методы стора
  const isAuth = useAuthStore((s) => s.isAuth);
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile); // Метод обновления профиля из store
  const fetchUserProfile = useAuthStore((s) => s.fetchUserProfile); // Метод получения полных данных пользователя
  
  const [gender, setGender] = useState(user?.gender || 'male');
  const [avatar, setAvatar] = useState(() => {
    // Если у пользователя есть аватар и он не равен 'noAvatar', формируем полный URL
    if (user?.avatar && user.avatar !== 'noAvatar') {
      return user.avatar.startsWith('http') ? user.avatar : `http://localhost:3000${user.avatar}`;
    }
    return './SRC/IMG/male/ava.png'; // Дефолтная картинка
  });
  const [avatarFile, setAvatarFile] = useState(null); // Файл для отправки на сервер
  
  // Состояния для редактируемых полей
  const [formData, setFormData] = useState({
    surname: user?.surname || '',
    firstname: user?.firstname || '',
    patronymic: user?.patronymic || '',
    phone: user?.phone || '',
    telegram: user?.telegram || '',
    geography: user?.geography || '',
    dateborn: user?.dateborn || ''
  });

  // Данные пользователя для инпутов

  // Обработчик сохранения данных
  const handleSaveData = async () => {
    console.log('=== НАЧАЛО СОХРАНЕНИЯ ===');
    console.log('Функция handleSaveData вызвана!');
    try {
      console.log('Данные для отправки:');
      console.log('- Email (для поиска):', user?.email);
      console.log('- Текстовые поля:', {
        surname: formData.surname,
        firstname: formData.firstname,
        patronymic: formData.patronymic,
        phone: formData.phone,
        telegram: formData.telegram,
        geography: formData.geography,
        dateborn: formData.dateborn,
        gender: gender
      });
      console.log('- Файл аватарки:', avatarFile ? `${avatarFile.name} (${avatarFile.size} bytes)` : 'не выбран');
      
      // Подготавливаем данные для отправки
      const profileData = {
        ...formData,
        gender,
        avatarFile
      };
      
      // Отправляем данные через store
      const result = await updateProfile(profileData);
      
      console.log('Данные успешно сохранены:', result);
      
      // Данные пользователя будут обновлены автоматически через fetchUserProfile в store
      
    } catch (error) {
      console.error('Ошибка при сохранении данных:', error);
    }
    console.log('=== КОНЕЦ СОХРАНЕНИЯ ===');
  };

  // Обработчик изменения полей формы
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Обработчик выбора аватарки
  const handleAvatarChange = (event) => {
    const file = event.target.files[0];
    console.log('=== ВЫБОР ФАЙЛА ===');
    console.log('Выбранный файл:', file);
    if (file) {
      console.log('Файл детали:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });
      
      // Сохраняем файл для отправки на сервер
      setAvatarFile(file);
      console.log('Файл сохранен в state:', file);
      
      // Показываем превью локально
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatar(e.target.result);
        console.log('Превью загружено');
      };
      reader.readAsDataURL(file);
    } else {
      console.log('Файл не выбран');
    }
    console.log('=== КОНЕЦ ВЫБОРА ФАЙЛА ===');
  };

  // Обновляем форму при изменении данных пользователя
  useEffect(() => {
    if (user) {
      console.log('CorrectUserData: обновляем форму с данными пользователя:', user);
      setFormData({
        surname: user.surname || '',
        firstname: user.firstname || '',
        patronymic: user.patronymic || '',
        phone: user.phone || '',
        telegram: user.telegram || '',
        geography: user.geography || '',
        dateborn: user.dateBorn ? new Date(user.dateBorn).toISOString().split('T')[0] : ''
      });
      
      // Обновляем пол
      if (user.gender) {
        setGender(user.gender);
      }
    }
  }, [user]);

  // Обновляем аватар при изменении данных пользователя
  useEffect(() => {
    if (user?.avatar && user.avatar !== 'noAvatar') {
      const avatarUrl = user.avatar.startsWith('http') ? user.avatar : `http://localhost:3000${user.avatar}`;
      setAvatar(avatarUrl);
    } else {
      setAvatar('./SRC/IMG/male/ava.png'); // Дефолтная картинка
    }
  }, [user?.avatar]);

  // Обновляем аватар в DOM при изменении локального состояния
  useEffect(() => {
    const correctDataAvatar = document.querySelector('.correct-data-profile-avatar-item-img');
    if (correctDataAvatar) {
      correctDataAvatar.src = avatar;
      console.log('CorrectUserData: обновлен аватар в DOM:', avatar);
    }
  }, [avatar]);

  // Проверяем аутентификацию при загрузке компонента
  useEffect(() => {
    console.log("Main: Проверяем состояние аутентификации...");

    // Если пользователь аутентифицирован, показываем личный кабинет
    if (isAuth) {
      console.log(
        "Main: Пользователь аутентифицирован, показываем личный кабинет"
      );
      setIsChecking(false);
    } else {
      console.log(
        "Main: Пользователь не аутентифицирован, перенаправляем на форму логина"
      );
      navigate("/login");
    }
  }, [isAuth, navigate]); // Проверяем при изменении аутентификации

  // Показываем загрузку пока проверяем аутентификацию
  if (isChecking) {
    return (
      <section className="root bg-color-main flex flex-row">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            width: "100%",
            color: "white",
            fontSize: "18px",
          }}
        >
          Проверка доступа...
        </div>
      </section>
    );
  }

  return (
    <div class="correct-data-profile-container flex flex-column">
      <div class="correct-data-profile-container-panel flex flex-row">
         <div class="correct-data-profile-avatar flex flex-column">
           <div class="correct-data-profile-avatar-item gradient-border  bru">
             <img
               class="correct-data-profile-avatar-item-img img"
               src={avatar}
               alt="user-avatar"
             />
           </div>
           <div class="correct-data-profile-avatar-item-button gradient-border bru flex pointer">
             <input
               type="file"
               accept="image/*"
               onChange={handleAvatarChange}
               style={{ display: 'none' }}
               id="avatar-upload"
             />
             <label htmlFor="avatar-upload" style={{ cursor: 'pointer', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               Изменить фото профиля
             </label>
           </div>
         </div>
        <div class="correct-data-profile-form flex flex-column">
          <div class="correct-data-profile-form-title">
            редкатирование данных
          </div>
          <div class="correct-data-personal-info-panel gradient-border bru flex flex-row">
            <div class="flex flex-column">
              <label htmlFor="correct-data-name" class="correct-data-label">
                Фамилия
              </label>
              <div class="gradient-border wrapper bru">
                 <input
                   type="text"
                   id="correct-data-name"
                   class="correct-data-input bru"
                   placeholder="Фамилия"
                   value={formData.surname}
                   onChange={(e) => handleInputChange('surname', e.target.value)}
                 />
              </div>
            </div>

            <div class="flex flex-column">
              <label
                htmlFor="correct-data-firstname"
                class="correct-data-label"
              >
                Имя
              </label>
              <div class="gradient-border wrapper bru">
                 <input
                   type="text"
                   id="correct-data-firstname"
                   class="correct-data-input bru"
                   placeholder="Имя"
                   value={formData.firstname}
                   onChange={(e) => handleInputChange('firstname', e.target.value)}
                 />
              </div>
            </div>
            <div class="flex flex-column">
              <label
                htmlFor="correct-data-patronymic"
                class="correct-data-label"
              >
                Отчество
              </label>
              <div class="gradient-border wrapper bru">
                 <input
                   type="text"
                   id="correct-data-patronymic"
                   class="correct-data-input bru"
                   placeholder="Отчество"
                   value={formData.patronymic}
                   onChange={(e) => handleInputChange('patronymic', e.target.value)}
                 />
              </div>
            </div>
            <div class="flex flex-column">
              <label htmlFor="correct-data-phone" class="correct-data-label">
                Телефон
              </label>
              <div class="gradient-border wrapper bru">
                 <input
                   type="tel"
                   id="correct-data-phone"
                   class="correct-data-input bru"
                   placeholder="Телефон"
                   value={formData.phone}
                   onChange={(e) => handleInputChange('phone', e.target.value)}
                 />
              </div>
            </div>

            <div class="flex flex-column">
              <label htmlFor="correct-data-telegram" class="correct-data-label">
                Telegram
              </label>
              <div class="gradient-border wrapper bru">
                 <input
                   type="text"
                   id="correct-data-telegram"
                   class="correct-data-input bru"
                   placeholder="@Telegram"
                   value={formData.telegram}
                   onChange={(e) => handleInputChange('telegram', e.target.value)}
                 />
              </div>
            </div>

            <div class="flex flex-column">
               <label htmlFor="correct-dateborn" class="correct-data-label">
                Дата рождения
              </label>
              <div class="gradient-border wrapper bru">
                 <input
                   type="date"
                   id="correct-dateborn"
                   class="correct-data-input bru"
                   placeholder="Дата рождения"
                   value={formData.dateborn}
                   onChange={(e) => handleInputChange('dateborn', e.target.value)}
                 />
              </div>
            </div>

            <div class="flex flex-column">
              <label
                htmlFor="correct-data-geography"
                class="correct-data-label"
              >
                Местоположение
              </label>
              <div class="gradient-border wrapper bru">
                 <input
                   type="text"
                   id="correct-data-geography"
                   class="correct-data-input bru"
                   placeholder="Россия. Москва"
                   value={formData.geography}
                   onChange={(e) => handleInputChange('geography', e.target.value)}
                 />
              </div>
            </div>

             <div class="flex gender-container gradient-border flex-row bru">
               <input
                 type="radio"
                 id="correct-data-gender-male"
                 checked={gender === 'male'}
                 onChange={() => setGender('male')}
                 name="gender"
                 class="correct-data-input bru"
               />
               <input
                 type="radio"
                 id="correct-data-gender-female"
                 checked={gender === 'female'}
                 onChange={() => setGender('female')}
                 name="gender"
                 class="correct-data-input bru"
               />
               <label
                 htmlFor="correct-data-gender-male"
                 class="correct-data-label pointer"
               >
                 М
               </label>
               <label
                 htmlFor="correct-data-gender-female"
                 class="correct-data-label pointer"
               >
                 Ж
               </label>
               <div class="correct-data-gender-container-chked bru"></div>
             </div>
          </div>
          <div class="correct-data-profile-delete-form gradient-border bru flex flex-column">
            <div class="correct-data-profile-delete-form-title">
              действия с аккаунтом
            </div>
            <div class="correct-data-profile-delete-form-text">
              <span>Удаление и блокировка аккаунта</span>
              <p>
                Вы не можете полностью удалить аккаунт. Блокировка аккаунта
                возможна только через администратора
              </p>
            </div>
            <div class="correct-data-profile-delete-form-icon">
              <div class="correct-data-profile-delete-form-icon-img flex img"></div>
            </div>
          </div>
        </div>
      </div>

       <div class="correct-data-profile-container-panel-button-container flex flex-row">
         <button 
           type="button"
           class="correct-data-profile-container-panel-button gradient-border flex bru pointer saveUserData"
           onClick={handleSaveData}
         >
           сохранить изменения
         </button>
         <div
           class="correct-data-profile-container-panel-button gradient-border flex bru pointer cancelUserData"
           onClick={onClose}
         >
           назад
         </div>
       </div>
    </div>
  );
}

export default CorrectUserData;
