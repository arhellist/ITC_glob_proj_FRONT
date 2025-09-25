import "./docs-room.css";
import { useEffect, useRef, useState } from "react";
import axiosAPI from "../../../JS/auth/http/axios.js";

function DocsRoom() {
  const fileInputRef = useRef(null);
  const [pending, setPending] = useState(false);
  const [currentKind, setCurrentKind] = useState(null);
  const [currentEndpoint, setCurrentEndpoint] = useState(null);
  const [statusByKind, setStatusByKind] = useState({}); // pending | success | error per kind

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await axiosAPI.get('/profile/docs/status');
        if (!mounted) return;
        const prepared = {};
        const kinds = Array.isArray(data?.kinds) ? data.kinds : [];
        const normalize = (s) => String(s || '').toLowerCase();
        const setSuccess = (k) => { prepared[k] = 'success'; };
        kinds.forEach(k => setSuccess(normalize(k)));
        // Мапим под наши ключи
        if (kinds.includes('pasport') || kinds.includes('PASPORT')) prepared['PASPORT'] = 'success';
        if (kinds.includes('investmentrules-crypto')) prepared['investmentrules-crypto'] = 'success';
        if (kinds.includes('bank-information')) prepared['bank-information'] = 'success';
        if (kinds.includes('investmentrules-ETF') || kinds.includes('investmentrules-etf')) prepared['investmentrules-ETF'] = 'success';
        if (kinds.includes('investmentrules-ETF2') || kinds.includes('investmentrules-etf2')) prepared['investmentrules-ETF2'] = 'success';
        if (kinds.includes('investmentrules-classic')) prepared['investmentrules-classic'] = 'success';
        setStatusByKind(prepared);
      } catch {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const triggerSelect = (endpoint, kind) => {
    setCurrentEndpoint(endpoint);
    setCurrentKind(kind);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentEndpoint || !currentKind) return;
    try {
      setStatusByKind(prev => ({ ...prev, [currentKind]: 'pending' }));
      setPending(true);
      const form = new FormData();
      // Поддержка множественных файлов
      const files = e.target.files ? Array.from(e.target.files) : [file];
      for (const f of files) form.append('files', f);
      form.append("kind", currentKind);
      await axiosAPI.post(currentEndpoint, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log("Документ загружен:", currentKind);
      setStatusByKind(prev => ({ ...prev, [currentKind]: 'success' }));
    } catch (err) {
      console.error("Ошибка загрузки документа:", err);
      setStatusByKind(prev => ({ ...prev, [currentKind]: 'error' }));
    } finally {
      setPending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setCurrentEndpoint(null);
      setCurrentKind(null);
    }
  };

  const btnClass = (base, kind) => {
    const st = statusByKind[kind];
    return base + (st === 'success' ? ' DL-COMPLITE' : st === 'error' ? ' DL-ERROR' : '');
  };

  return (
    <div class="add-document-container gradient-border bru-max flex flex-column">
      <div class="add-document-title">проверка документов</div>
      <div class="add-document-button-container flex flex-row">
        <div class="add-document-button-container-item gradient-border flex flex-column bru ">
          <div
            class={btnClass("add-document-button-container-item-button flex bru pointer DLpasrort", 'PASPORT')}
            onClick={() => triggerSelect("/profile/docs/passport", "PASPORT")}
          >
            Загрузить фото паспорта
            <div class="iconRefresh img" style={{ display: statusByKind['PASPORT'] === 'pending' ? 'block' : 'none' }}></div>
            <div class="iconOk img" style={{ display: statusByKind['PASPORT'] === 'success' ? 'block' : 'none' }}></div>
            <div class="iconEr img" style={{ display: statusByKind['PASPORT'] === 'error' ? 'block' : 'none' }}></div>
          </div>
          <span class="add-document-button-container-item-text">
            Изображение должно быть четким, не обрезаным, без бликов, хорошо
            читаемым
          </span>
        </div>

        <div class="add-document-button-container-item gradient-border flex flex-column bru">
          <div
            class={btnClass("add-document-button-container-item-button flex bru pointer DLinvestmentrules-crypto", 'investmentrules-crypto')}
            onClick={() =>
              triggerSelect("/profile/docs/other", "investmentrules-crypto")
            }
          >
            Загрузить инвестиционные правилавила <br />
            криптовалютный продукт
            <div class="iconRefresh img" style={{ display: statusByKind['investmentrules-crypto'] === 'pending' ? 'block' : 'none' }}></div>
            <div class="iconOk img" style={{ display: statusByKind['investmentrules-crypto'] === 'success' ? 'block' : 'none' }}></div>
            <div class="iconEr img" style={{ display: statusByKind['investmentrules-crypto'] === 'error' ? 'block' : 'none' }}></div>
          </div>
          <span class="add-document-button-container-item-text">
            Изображение должно быть четким, не обрезаным, без бликов, хорошо
            читаемым
          </span>
        </div>

        <div class="add-document-button-container-item gradient-border flex flex-column bru">
          <div
            class={btnClass("add-document-button-container-item-button flex bru pointer DLbankinformation ", 'bank-information')}
            onClick={() =>
              triggerSelect("/profile/docs/other", "bank-information")
            }
          >
            Справка из банка
            <div class="iconRefresh img" style={{ display: statusByKind['bank-information'] === 'pending' ? 'block' : 'none' }}></div>
            <div class="iconOk img" style={{ display: statusByKind['bank-information'] === 'success' ? 'block' : 'none' }}></div>
            <div class="iconEr img" style={{ display: statusByKind['bank-information'] === 'error' ? 'block' : 'none' }}></div>
          </div>
          <span class="add-document-button-container-item-text">
            Изображение должно быть четким, не обрезаным, без бликов, хорошо
            читаемым
          </span>
        </div>

        <div class="add-document-button-container-item gradient-border flex flex-column bru">
          <div
            class={btnClass("add-document-button-container-item-button flex bru pointer DLinvestmentrules-ETF", 'investmentrules-ETF')}
            onClick={() =>
              triggerSelect("/profile/docs/other", "investmentrules-ETF")
            }
          >
            Загрузить инвестиционные правилавила <br />
            продукт ETF ITC
            <div class="iconRefresh img" style={{ display: statusByKind['investmentrules-ETF'] === 'pending' ? 'block' : 'none' }}></div>
            <div class="iconOk img" style={{ display: statusByKind['investmentrules-ETF'] === 'success' ? 'block' : 'none' }}></div>
            <div class="iconEr img" style={{ display: statusByKind['investmentrules-ETF'] === 'error' ? 'block' : 'none' }}></div>
          </div>
          <span class="add-document-button-container-item-text">
            Изображение должно быть четким, не обрезаным, без бликов, хорошо
            читаемым
          </span>
        </div>

        <div class="add-document-button-container-item add-about flex flex-column bru bg-color-lilac">
          <h2 class="add-document-button-container-item-about-title">
            проверка документов
          </h2>
          <span class="add-document-button-container-item-about-text">
            После загрузки вашего паспорта мы начинаем процесс проверки данных.
            Обычно это занимает от нескольких часов до пяти рабочих дней. В
            случае успешной проверки вы получите уведомление о подтверждении
            вашей личности.
          </span>
          <span class="add-document-button-container-item-about-text">
            Если возникнут вопросы или потребуется дополнительная информация,
            наш сотрудник свяжется с вами. В случае одобрения документов, вы
            сможете продолжить работу с нашим сервисом. В случае отклонения — вы
            получите объяснение и сможете повторно загрузить документы
          </span>
        </div>

        <div class="add-document-button-container-item lastChildContainer flex flex-column">
          <div class="add-document-button-container-item gradient-border flex flex-column bru">
            <div
              class={btnClass("add-document-button-container-item-button flex bru pointer DLinvestmentrules-ETF2", 'investmentrules-ETF2')}
              onClick={() =>
                triggerSelect("/profile/docs/other", "investmentrules-ETF2")
              }
            >
              Загрузить инвестиционные правилавила <br />
              продукт ETF ITC 2.0
              <div class="iconRefresh img" style={{ display: statusByKind['investmentrules-ETF2'] === 'pending' ? 'block' : 'none' }}></div>
              <div class="iconOk img" style={{ display: statusByKind['investmentrules-ETF2'] === 'success' ? 'block' : 'none' }}></div>
              <div class="iconEr img" style={{ display: statusByKind['investmentrules-ETF2'] === 'error' ? 'block' : 'none' }}></div>
            </div>
            <span class="add-document-button-container-item-text">
              Изображение должно быть четким, не обрезаным, без бликов, хорошо
              читаемым
            </span>
          </div>

          <div class="add-document-button-container-item gradient-border flex flex-column bru">
            <div
              class={btnClass("add-document-button-container-item-button flex bru pointer DLinvestmentrules-classic", 'investmentrules-classic')}
              onClick={() =>
                triggerSelect("/profile/docs/other", "investmentrules-classic")
              }
            >
              Загрузить инвестиционные правилавила <br />
              продукт классический
              <div class="iconRefresh img" style={{ display: statusByKind['investmentrules-classic'] === 'pending' ? 'block' : 'none' }}></div>
              <div class="iconOk img" style={{ display: statusByKind['investmentrules-classic'] === 'success' ? 'block' : 'none' }}></div>
              <div class="iconEr img" style={{ display: statusByKind['investmentrules-classic'] === 'error' ? 'block' : 'none' }}></div>
            </div>
            <span class="add-document-button-container-item-text">
              Изображение должно быть четким, не обрезаным, без бликов, хорошо
              читаемым
            </span>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf"
        style={{ display: "none" }}
        onChange={onFileChange}
        disabled={pending}
      />
    </div>
  );
}

export default DocsRoom;
