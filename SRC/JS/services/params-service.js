

export const activated = (props) => {
    console.log(`activated in params-service - START: ` + props)

  if (props) {
    console.log(`activated in params-service - TRUE`)
    return props;
  } else {
    console.log(`activated in params-service - FALSE`)
    return props;
  }
};
