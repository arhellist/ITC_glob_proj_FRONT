
// функция закрытия меню
export const closeMenu = (root) => {

    console.log(`closeMenu utils has been started, root: `);
    console.log(root);

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
  } else if (!root.classList.contains("blur-active") && !root.classList.contains("blur-blur")) {
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
    console.log(`openMenu utils has been started, root: `);
    console.log(root);
    if(root.classList.contains("blur-active")){
        root.classList.remove("blur-active");
        root.classList.add("blur-blur");
    } else if (!root.classList.contains("blur-blur") && !root.classList.contains("blur-active")){
        root.classList.add("blur-blur");
    } else {
       console,log(`Ничего не произошло при открытии окна. Нет допустимых условий`)
    }   
};

