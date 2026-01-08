import "./partner-progs.css";
import { useAuthStore } from "../../../JS/auth/store/store";
import { useEffect, useState } from "react";
import axiosAPI from "../../../JS/auth/http/axios.js";
import defaultMaleAvatar from "../../../IMG/male/ava.png";
import defaultFemaleAvatar from "../../../IMG/female/ava.png";

function PartnerProgs() {
  const user = useAuthStore(s => s.user);
  const refLink = user?.refLink || "";
  const fullRefUrl = refLink ? `${window.location.origin}/ref/${refLink}` : "";
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false);
  const [referralAccount, setReferralAccount] = useState(null);
  const [totalReferralRewards, setTotalReferralRewards] = useState(0);
  const [hasReferrals, setHasReferrals] = useState(false);
  const [currency, setCurrency] = useState('USDT');
  const [rewardsHistory, setRewardsHistory] = useState([]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const { data } = await axiosAPI.get('/profile/referrals');
        if (!isMounted) return;
        setReferrals(Array.isArray(data?.referrals) ? data.referrals : []);
        setReferralAccount(data?.referralAccount || null);
        setTotalReferralRewards(data?.totalReferralRewards || 0);
        setHasReferrals(data?.hasReferrals || false);
        setCurrency(data?.currency || 'USDT');
        setRewardsHistory(Array.isArray(data?.rewardsHistory) ? data.rewardsHistory : []);
      } catch (e) {
        if (!isMounted) return;
        setError('Не удалось загрузить рефералов');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const handleCopy = () => {
    if (!fullRefUrl) return;
    try {
      navigator.clipboard.writeText(fullRefUrl);
      setShowCopiedTooltip(true);
      setTimeout(() => {
        setShowCopiedTooltip(false);
      }, 2000);
    } catch (e) {
      console.error("Ошибка при копировании ссылки:", e);
    }
  };

  return (
    <div className="partners-program-container flex flex-row">
      <div className="partners-program-left flex flex-column">
        <div className="partners-program-reflink gradient-border bru-max flex flex-column">
          <h2 className="partners-program-reflink-title">Реферальная ссылка</h2>

          <div className="partners-program-reflink-link gradient-border bru flex flex-row">
            <span className="partners-program-reflink-link-text flex">{fullRefUrl || "—"}</span>
            <div className="partners-program-reflink-link-button-container">
              <div className="partners-program-reflink-link-button flex pointer bru gradient-border" onClick={handleCopy}>
                <div className="partners-program-reflink-link-button-img img"></div>
              </div>
              {showCopiedTooltip && (
                <div className="partners-program-reflink-link-button-tooltip">
                  СКОПИРОВАНО
                </div>
              )}
            </div>
          </div>

          <span className="partners-program-reflink-text">Скопируйте ссылку, чтобы поделиться</span>
        </div>

        <div className="partners-program-aboutreferal flex flex-row">
          <div className="partners-program-aboutreferal-text bg-color-lilac flex flex-column bru-max">
            <div className="partners-program-aboutreferal-text-bookmark">
              <div className="partners-program-aboutreferal-text-bookmark-img img"></div>
            </div>
            <h3 className="partners-program-aboutreferal-text-title">зачем делиться реферальной ссылкой?</h3>
            <span className="partners-program-aboutreferal-text-text flex flex-column">
              <p>Делитесь своей реферальной ссылкой с друзьями и знакомыми. </p>
              <p>За каждого нового клиента, который зарегистрируется и начнет инвестировать по вашей ссылке, вы будете получать доход.</p>
              <p>Это отличный способ заработать дополнительные деньги, помогая другим начать инвестировать и одновременно увеличивая свой доход.</p>
            </span>
          </div>

          <div className="partners-program-aboutreferal-accounts flex flex-column">
            <div className="partners-program-aboutreferal-account-item gradient-border bru-max flex flex-column">
              <div className="partners-program-aboutreferal-account-item-title">реферальный счет</div>
              {!hasReferrals ? (
                <div className="partners-program-aboutreferal-account-item-text partners-program-aboutreferal-account-item-text-info">
                  Реферальный счет будет открыт автоматически, как только по вашей ссылке зарегистрируется новый инвестор
                </div>
              ) : referralAccount ? (
                <div className="partners-program-aboutreferal-account-item-text">
                  {referralAccount.balance.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                </div>
              ) : (
                <div className="partners-program-aboutreferal-account-item-text">0.00 {currency}</div>
              )}
            </div>

            <div className="partners-program-aboutreferal-account-item gradient-border bru-max flex flex-column">
              <div className="partners-program-aboutreferal-account-item-title">история зачислений</div>
              <div className="partners-program-aboutreferal-account-item-rewards-list">
                {rewardsHistory.length === 0 ? (
                  <div className="partners-program-rewards-empty">
                    Начисления появятся здесь после регистрации новых инвесторов по вашей ссылке и пополнения ими своих счетов
                  </div>
                ) : (
                  <div className="partners-program-rewards-scroll">
                    {rewardsHistory.map((reward) => (
                      <div key={reward.id} className="partners-program-reward-item">
                        <div className="partners-program-reward-item-header">
                          <span className="partners-program-reward-item-amount">
                            +{reward.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {reward.currency}
                          </span>
                          <span className="partners-program-reward-item-date">
                            {new Date(reward.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="partners-program-reward-item-description">
                          {reward.description}
                        </div>
                        {reward.referredUserName && (
                          <div className="partners-program-reward-item-user">
                            От: {reward.referredUserName}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="partners-program-right gradient-border flex flex-column bru-max">
        <div className="partners-program-right-title">таблица партнеров</div>
        <div className="partners-program-right-table flex flex-column">
          {loading && <div className="partners-loading">Загрузка...</div>}
          {error && <div className="partners-error">{error}</div>}
          {!loading && !error && referrals.length === 0 && (
            <div className="partners-empty">У вас пока нет рефералов</div>
          )}
          {!loading && !error && referrals.map(ref => {
            // Определяем дефолтный аватар по полу
            const defaultAvatar = ref.gender === 'female' ? defaultFemaleAvatar : defaultMaleAvatar;
            
            // Строгая проверка наличия валидного аватара
            const avatar = ref.avatar;
            let avatarUrl = defaultAvatar; // По умолчанию дефолтный
            let hasValidAvatar = false;
            
            // Проверяем, что аватар существует и валиден
            // Если аватара нет или он невалидный - используем дефолтный БЕЗ попытки загрузки
            if (avatar !== null && 
                avatar !== undefined && 
                typeof avatar === 'string' && 
                avatar.trim() !== '' && 
                avatar.trim() !== 'noAvatar' && 
                avatar.trim() !== 'null' && 
                avatar.trim() !== 'undefined' &&
                avatar.trim().length > 0) {
              
              const trimmedAvatar = avatar.trim();
              
              // Если это полный URL
              if (trimmedAvatar.startsWith('http://') || trimmedAvatar.startsWith('https://')) {
                avatarUrl = trimmedAvatar;
                hasValidAvatar = true;
              } 
              // Если это путь начинающийся с /
              else if (trimmedAvatar.startsWith('/')) {
                avatarUrl = trimmedAvatar;
                hasValidAvatar = true;
              } 
              // Иначе формируем путь /users/{avatar}
              else {
                avatarUrl = `/users/${trimmedAvatar}`;
                hasValidAvatar = true;
              }
            }
            // Если аватара нет - avatarUrl уже установлен в defaultAvatar, hasValidAvatar = false
            
            return (
              <div key={ref.id} className="partners-program-right-table-item  gradient-border flex flex-row bru">
                <div className="partners-program-right-table-item-img flex bru gradient-border">
                  <img 
                    src={avatarUrl} 
                    alt={ref.fio || 'Партнер'} 
                    className="partners-program-right-table-item-img-img"
                    onError={hasValidAvatar ? (e) => {
                      // Если аватар не загрузился, используем дефолтный
                      // Проверяем, что это не дефолтный аватар, чтобы избежать цикла
                      const currentSrc = e.target.src || '';
                      const isDefault = currentSrc.includes('ProfileAdd.png') || currentSrc.includes('ProfileFemale.png');
                      if (!isDefault) {
                        e.target.src = defaultAvatar;
                        e.target.onerror = null; // Убираем обработчик после первой ошибки, чтобы избежать цикла
                      }
                    } : undefined}
                  />
                </div>
                <span className="partners-program-right-table-item-name">{ref.fio || '—'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PartnerProgs;
