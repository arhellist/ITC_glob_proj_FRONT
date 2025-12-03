import "./partner-progs.css";
import { useAuthStore } from "../../../JS/auth/store/store";
import { useEffect, useState } from "react";
import axiosAPI from "../../../JS/auth/http/axios.js";

function PartnerProgs() {
  const user = useAuthStore(s => s.user);
  const refLink = user?.refLink || "";
  const fullRefUrl = refLink ? `${window.location.origin}/ref/${refLink}` : "";
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const { data } = await axiosAPI.get('/profile/referrals');
        if (!isMounted) return;
        setReferrals(Array.isArray(data?.referrals) ? data.referrals : []);
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
              <div className="partners-program-aboutreferal-account-item-text">5,700 $</div>
            </div>

            <div className="partners-program-aboutreferal-account-item gradient-border bru-max flex flex-column">
              <div className="partners-program-aboutreferal-account-item-title">разовый доход по реферальной ссылке</div>
              <div className="partners-program-aboutreferal-account-item-text">5,700 $</div>
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
          {!loading && !error && referrals.map(ref => (
            <div key={ref.id} className="partners-program-right-table-item  gradient-border flex flex-row bru">
              <div className="partners-program-right-table-item-img flex bru gradient-border">
                <div className="partners-program-right-table-item-img-img img"></div>
              </div>
              <span className="partners-program-right-table-item-name">{ref.fio || '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PartnerProgs;
