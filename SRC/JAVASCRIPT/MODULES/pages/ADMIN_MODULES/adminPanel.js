import { clearDOMPurify } from "../../utils.js";

export default async function insertAdminPanel(root) {
    const template = `
        <div class="admin-panel-container flex flex-column">
            <div class="admin-panel-header flex flex-row">
                <div class="admin-panel-header-item flex flex-row bru">
                    <span>Клиенты</span>
                </div>      
                <div class="admin-panel-header-item flex flex-row bru">
                    <span>Счета</span>
                </div>
                <div class="admin-panel-header-item flex flex-row bru">
                    <span>Клиенты</span>
                </div>
                
            </div>
            <div class="admin-panel-body flex flex-row">
                
            </div>
        </div>
    `
    const clean = clearDOMPurify(template);
    root.insertAdjacentHTML("beforeend", clean);
}


