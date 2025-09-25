import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Registration from "./forms/registration";
import "./entryes.css";

function RefCapture() {
  const { refCode } = useParams();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    console.log('RefCapture: Получен реферальный код:', refCode);
    
    // Сохраняем реферальный код
    try {
      if (refCode && typeof window !== 'undefined') {
        localStorage.setItem('itc_ref_link_partner', refCode);
        console.log('RefCapture: Реферальный код сохранен в localStorage:', refCode);
      }
    } catch (e) {
      console.error('RefCapture: Ошибка сохранения в localStorage:', e);
    }
    
    // Показываем форму регистрации
    console.log('RefCapture: Показываем форму регистрации с реферальным кодом');
    setIsChecking(false);
  }, [refCode]);

  if (isChecking) {
    return (
      <section className="entryes">
        <div className="entryes-bg"></div>
        <div className="entryes-bg-overlay"></div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            color: "white",
            fontSize: "18px",
          }}
        >
          Загрузка формы регистрации...
        </div>
      </section>
    );
  }

  console.log('RefCapture: Рендерим форму регистрации');
  
  return (
    <>
      <section className="entryes">
        <div className="entryes-bg"></div>
        <div className="entryes-bg-overlay"></div>
        <Registration />
      </section>
    </>
  );
}

export default RefCapture;
