import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosAPI from "../../JS/auth/http/axios";
import "./entryes.css";

function AccountActivation() {
  const { activationLink } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const activateAccount = async () => {
      try {
        console.log('AccountActivation: Активируем аккаунт с ссылкой:', activationLink);
        
        const response = await axiosAPI.get(`/profile/activate/${activationLink}`);
        
        console.log('AccountActivation: Ответ от сервера:', response.data);
        
        if (response.data.activated) {
          setStatus('success');
          setMessage(response.data.message || 'Аккаунт успешно активирован! Теперь вы можете войти в систему.');
          
          // Перенаправляем на страницу логина через 3 секунды
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(response.data.message || 'Ошибка активации аккаунта');
        }
      } catch (error) {
        console.error('AccountActivation: Ошибка активации:', error);
        setStatus('error');
        
        if (error.response?.status === 400) {
          setMessage('Неверная ссылка активации или аккаунт уже активирован');
        } else if (error.response?.status === 404) {
          setMessage('Ссылка активации не найдена');
        } else {
          setMessage('Произошла ошибка при активации аккаунта. Попробуйте позже.');
        }
      }
    };

    if (activationLink) {
      activateAccount();
    } else {
      setStatus('error');
      setMessage('Отсутствует ссылка активации');
    }
  }, [activationLink, navigate]);

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return '⏳';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return '#ffa500'; // оранжевый
      case 'success':
        return '#4caf50'; // зеленый
      case 'error':
        return '#f44336'; // красный
      default:
        return '#666'; // серый
    }
  };

  return (
    <section className="entryes">
      <div className="entryes-bg"></div>
      <div className="entryes-bg-overlay"></div>
      
      <div className="activation-container" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: '40px',
          borderRadius: '10px',
          maxWidth: '500px',
          width: '100%'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '20px'
          }}>
            {getStatusIcon()}
          </div>
          
          <h1 style={{
            color: 'white',
            fontSize: '24px',
            marginBottom: '20px',
            fontWeight: 'bold'
          }}>
            {status === 'loading' && 'Активация аккаунта...'}
            {status === 'success' && 'Аккаунт активирован!'}
            {status === 'error' && 'Ошибка активации'}
          </h1>
          
          <p style={{
            color: getStatusColor(),
            fontSize: '16px',
            marginBottom: '30px',
            lineHeight: '1.5'
          }}>
            {message}
          </p>
          
          {status === 'success' && (
            <p style={{
              color: '#ccc',
              fontSize: '14px',
              marginBottom: '20px'
            }}>
              Через несколько секунд вы будете перенаправлены на страницу входа...
            </p>
          )}
          
          <div style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => navigate('/login')}
              style={{
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              Войти в систему
            </button>
            
            <button
              onClick={() => navigate('/registration')}
              style={{
                backgroundColor: 'transparent',
                color: 'white',
                border: '2px solid white',
                padding: '12px 24px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              Регистрация
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AccountActivation;
