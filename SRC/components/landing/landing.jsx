import "./landing.css";
import "./landing-responsive.css"; // Импорт адаптивных стилей для лендинга (мобильная и планшетная версия)
import Entryes from "../entryes/entryes";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    const eighthFrame = document.querySelector('.eighthFrame');
    const performanceBox = document.querySelector('.performance-indicators-box');
    if (!eighthFrame || !performanceBox) return;

    let animationTriggered = false;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!animationTriggered && entry.isIntersecting) {
          performanceBox.classList.add('animate-parallelepiped');
          animationTriggered = true;
          observer.disconnect();
        }
      },
      {
        root: null,
        threshold: 0.3,
        rootMargin: '0px 0px -15% 0px',
      }
    );

    observer.observe(eighthFrame);
    return () => observer.disconnect();
  }, []);

  // Инициализация слайдеров через React-хук
  useEffect(() => {
    const sliders = Array.from(document.querySelectorAll('.slider'));
    const cleanups = [];
    const styleEl = document.createElement('style');
    styleEl.textContent = `.slider::-webkit-scrollbar { display: none; }`;
    document.head.appendChild(styleEl);

    sliders.forEach((slider) => {
      const slides = slider.querySelectorAll('.slideItem');
      const sliderContainer = slider.closest('article') || slider.parentElement;
      const navButtons = sliderContainer ? sliderContainer.querySelectorAll('.navButton') : [];

      if (!slides.length || !navButtons.length) return;

      let currentSlide = 0;
      const totalSlides = slides.length;

      const updateSlidePosition = () => {
        const sliderWidth = slider.clientWidth;
        const scrollLeft = currentSlide * sliderWidth;
        slides.forEach((slide) => {
          slide.style.width = `${sliderWidth}px`;
          slide.style.flexShrink = '0';
          slide.style.flexGrow = '0';
          slide.style.minWidth = `${sliderWidth}px`;
        });
        slider.style.scrollBehavior = 'smooth';
        slider.scrollLeft = scrollLeft;
      };

      const updateDots = () => {
        navButtons.forEach((btn, idx) => {
          btn.classList.toggle('activePositionSlide', idx === currentSlide);
        });
      };

      const goToSlide = (index) => {
        if (index < 0 || index >= totalSlides) return;
        currentSlide = index;
        updateSlidePosition();
        updateDots();
      };

      const onResize = () => updateSlidePosition();
      window.addEventListener('resize', onResize);
      cleanups.push(() => window.removeEventListener('resize', onResize));

      const clickHandlers = [];
      navButtons.forEach((btn, idx) => {
        const handler = () => goToSlide(idx);
        btn.addEventListener('click', handler);
        clickHandlers.push({ btn, handler });
      });
      cleanups.push(() => {
        clickHandlers.forEach(({ btn, handler }) => btn.removeEventListener('click', handler));
      });

      const handleKeyboard = (event) => {
        const rect = slider.getBoundingClientRect();
        const visible = rect.top < window.innerHeight && rect.bottom > 0;
        if (!visible) return;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          goToSlide(Math.min(currentSlide + 1, totalSlides - 1));
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          goToSlide(Math.max(currentSlide - 1, 0));
        }
      };
      window.addEventListener('keydown', handleKeyboard);
      cleanups.push(() => window.removeEventListener('keydown', handleKeyboard));

      // Инициализация стилей контейнера
      slider.style.display = 'flex';
      slider.style.width = '100%';
      slider.style.overflowX = 'hidden';
      slider.style.overflowY = 'hidden';
      slider.style.scrollBehavior = 'smooth';
      slider.style.scrollbarWidth = 'none';
      slider.style.msOverflowStyle = 'none';

      // Стартовое состояние
      updateSlidePosition();
      updateDots();
    });

    return () => {
      cleanups.forEach((fn) => fn());
      if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    };
  }, []);

    return (
      <>
      <section className="bg"></section>
    <section className="bg-footer">
      <div className="bg-footer-img bgImg"></div>
    </section>

    <section className="main-frame flex fd-column">


      <header className="main-frame_heaader flex fd-row">
        <div className="main-frame_heaader__logo bgImg pointer" role="img" aria-label="Invest Time Capital Logo"></div>
        <nav className="main-frame_heaader__list flex fd-row">
          <a className="main-frame_heaader__list-item pointer bru" href="#aboutus">about us</a>
          <a className="main-frame_heaader__list-item pointer bru" href="#strategies">strategies</a>
          <a className="main-frame_heaader__list-item pointer bru displyn-none" href="#team">team</a>
          <a className="main-frame_heaader__list-item pointer bru displyn-none" href="#faq">faq</a>
        </nav>
        <a className="main-frame_heaader_selectLanguage bru brc-white pointer" href="./ru/index.html">RU</a>
        <a className="main-frame_heaader_usericoon bgImg pointer" onClick={() => navigate('/login')} aria-label="Access personal account"></a>
      </header>

      <article className="first-frame_content flex fd-column">
        <div className="first-frame_content-row flex fd-row">
          <span className="first-frame_content-row_smallWrite">
            This platform is operated under the legal
            <br />
            jurisdiction of Hong Kong
          </span>
          <span className="first-frame_content-row_bigWrite">invest in the future</span>
        </div>
        <div className="first-frame_content-row flex fd-row">
          <span className="first-frame_content-row_bigWrite">of finance</span>
          <span className="first-frame_content-row_button flex fd-row pointer" onClick={() => navigate('/login')}>
            <a href="#">become an investor</a>
            <div className="first-frame_content-row_button-iconROW bgImg"></div>
          </span>
        </div>
        <div className="first-frame_content-row flex fd-row">
          <span className="first-frame_content-row__bottomContent bru brc-white">Traditional markets and Digital assets</span>
          <span className="first-frame_content-row__bottomContent bru brc-white">Diversification</span>
          <span className="first-frame_content-row__bottomContent bru brc-white">Expertise</span>
        </div>
      </article>
    </section>

    <section className="main-frame flex fd-column smooth-scroll" id="aboutus">
      <article className="second-frame_content flex fd-column preventDefault">
        <span className="second-frame_content-row">Infrastructure built</span>
        <span className="second-frame_content-row">by investors for investors</span>
        <span className="second-frame_content-row">
          <p>We are an international team of financial professionals operating</p>
          <p>a platform that provides access to independent market analytics,</p>
          <p>strategic overviews, and third-party partner services</p>
        </span>
      </article>

      <div className="second-frame__bgRounsCoins flex">
        <div className="second-frame__CoinsImg bgImg" role="img" aria-label="Rotating coins - investment symbol"></div>
      </div>

      <nav className="second-frame_infoPanel flex fd-row">
        <div className="second-frame_infoPanel-item flex fd-column pointer">
          <span className="second-frame_infoPanel-item-textContent">Global investment insights</span>
        </div>
        <div className="second-frame_infoPanel-item flex fd-column pointer">
          <span className="second-frame_infoPanel-item-textContent">Secure infrastructure</span>
        </div>
        <div className="second-frame_infoPanel-item flex fd-column pointer">
          <span className="second-frame_infoPanel-item-textContent">Individualized approach</span>
        </div>
        <div className="second-frame_infoPanel-item flex fd-column pointer">
          <span className="second-frame_infoPanel-item-textContent">Support for staking, Web3, ETFs and private markets</span>
        </div>
      </nav>
    </section>

    <section className="main-frame flex fd-column smooth-scroll" id="strategies">
      <article className="third-frame flex fd-column">
        <h2 className="third-frame-header flex fd-column preventDefault">
          <span className="third-frame-header_topRow">A balanced and</span>
          <span className="third-frame-header_bottomRow">flexible strategy</span>
        </h2>

        <div className="third-frame-slider slider flex fd-row" id="slider">
          <article className="third-frame-slider_page slideItem flex fd-column">
            <header className="third-frame-slider-page__header flex fd-column">
              <span className="third-frame-slider-page__headerLine">Traditional assets: ETFs, bonds, equities, and funds offer</span>
              <span className="third-frame-slider-page__headerLine">time-tested diversification opportunities and long-term</span>
              <span className="third-frame-slider-page__headerLine">portfolio growth.</span>
            </header>
            <div className="third-frame-slider-page__content flex fd-row">
              <div className="third-frame-slider-page__content___cart flex fd-column">
                <div className="third-frame-slider-page__content___cartIMG bgImg" role="img" aria-label="Apple Inc investment chart"></div>
                <div className="third-frame-slider-page__content___cartTITLE">+1,900 $</div>

                <div className="third-frame-slider-page__content___cartFOOTER flex fd-row">
                  <div className="third-frame-slider-page__content___cartFOOTER_labelBrand flex fd-row">
                    <div className="third-frame-slider-page__content___cartFOOTER_labelBrand-IMG flex">
                      <div className="third-frame-slider-page__content___cartFOOTER_labelBrand-IMG-logo bgImg" role="img" aria-label="Apple Inc logo"></div>
                    </div>
                    <div className="third-frame-slider-page__content___cartFOOTER_labelBrand-DESCRIOPTION flex fd-column">
                      <span className="third-frame-slider-page__content___cartFOOTER_labelBrand-DESCRIOPTION-name">Apple Inc</span>
                      <span className="third-frame-slider-page__content___cartFOOTER_labelBrand-DESCRIOPTION-date">26.08.25</span>
                    </div>
                  </div>
                  <span className="third-frame-slider-page__content___cartFOOTER_labelBrand-PERCENT">10.65%</span>
                </div>
              </div>
              <div className="third-frame-slider-page__content___cart flex fd-column">
                <div className="third-frame-slider-page__content___cartIMG bgImg" role="img" aria-label="NVIDIA Corporation investment chart"></div>
                <div className="third-frame-slider-page__content___cartTITLE">+5,700 $</div>

                <div className="third-frame-slider-page__content___cartFOOTER flex fd-row">
                  <div className="third-frame-slider-page__content___cartFOOTER_labelBrand flex fd-row">
                    <div className="third-frame-slider-page__content___cartFOOTER_labelBrand-IMG flex">
                      <div className="third-frame-slider-page__content___cartFOOTER_labelBrand-IMG-logo bgImg" role="img" aria-label="NVIDIA Corporation logo"></div>
                    </div>
                    <div className="third-frame-slider-page__content___cartFOOTER_labelBrand-DESCRIOPTION flex fd-column">
                      <span className="third-frame-slider-page__content___cartFOOTER_labelBrand-DESCRIOPTION-name">NVIDIA Corporation</span>
                      <span className="third-frame-slider-page__content___cartFOOTER_labelBrand-DESCRIOPTION-date">20.07.25</span>
                    </div>
                  </div>
                  <span className="third-frame-slider-page__content___cartFOOTER_labelBrand-PERCENT">26.15%</span>
                </div>
              </div>
              <div className="third-frame-slider-page__content___cart flex fd-column">
                <div className="third-frame-slider-page__content___cartIMG bgImg" role="img" aria-label="Tesla investment chart"></div>
                <div className="third-frame-slider-page__content___cartTITLE">+2,050 $</div>
                <div className="third-frame-slider-page__content___cartFOOTER flex fd-row">
                  <div className="third-frame-slider-page__content___cartFOOTER_labelBrand flex fd-row">
                    <div className="third-frame-slider-page__content___cartFOOTER_labelBrand-IMG flex">
                      <div className="third-frame-slider-page__content___cartFOOTER_labelBrand-IMG-logo bgImg" role="img" aria-label="Tesla logo"></div>
                    </div>
                    <div className="third-frame-slider-page__content___cartFOOTER_labelBrand-DESCRIOPTION flex fd-column">
                      <span className="third-frame-slider-page__content___cartFOOTER_labelBrand-DESCRIOPTION-name">Tesla</span>
                      <span className="third-frame-slider-page__content___cartFOOTER_labelBrand-DESCRIOPTION-date">11.07.25</span>
                    </div>
                  </div>
                  <span className="third-frame-slider-page__content___cartFOOTER_labelBrand-PERCENT">4.75%</span>
                </div>
              </div>
            </div>
          </article>

          <article className="third-frame-slider_page slideItem flex fd-column">
            <header className="third-frame-slider-page__header flex fd-column">
              <span className="third-frame-slider-page__headerLine">Digital assets: Bitcoin, Ethereum, Web3, and DeFi</span>
              <span className="third-frame-slider-page__headerLine">infrastructure open new investment horizons in emerging</span>
              <span className="third-frame-slider-page__headerLine">decentralized technologies.</span>
            </header>
            <div className="third-frame-slider-page__content flex fd-row">
              <div className="third-frame-slider-page__content___cart flex fd-column">
                <div className="third-frame-slider-page__content___cartIMG bgImg" role="img" aria-label="Bitcoin investment chart"></div>
                <div className="third-frame-slider-page__content___cartTITLE">+5,800 $</div>
                <div className="third-frame-slider-page__content___cartFOOTER flex fd-row">
                  <div className="third-frame-slider-page__content___cartFOOTER_labelBrand flex fd-row">
                    <div className="third-frame-slider-page__content___cartFOOTER_labelBrand-IMG flex">
                      <div className="third-frame-slider-page__content___cartFOOTER_labelBrand-IMG-logo bgImg" role="img" aria-label="Bitcoin logo"></div>
                    </div>
                    <div className="third-frame-slider-page__content___cartFOOTER_labelBrand-DESCRIOPTION flex fd-column">
                      <span className="third-frame-slider-page__content___cartFOOTER_labelBrand-DESCRIOPTION-name">Bitcoin</span>
                      <span className="third-frame-slider-page__content___cartFOOTER_labelBrand-DESCRIOPTION-date">21.07.25</span>
                    </div>
                  </div>
                  <span className="third-frame-slider-page__content___cartFOOTER_labelBrand-PERCENT">5.34%</span>
                </div>
              </div>
              <div className="third-frame-slider-page__content___cart flex fd-column">
                <div className="third-frame-slider-page__content___cartIMG bgImg" role="img" aria-label="Ethereum investment chart"></div>
                <div className="third-frame-slider-page__content___cartFOOTER flex fd-row">
                  <div className="third-frame-slider-page__content___cartFOOTER_labelBrand flex fd-row">
                    <div className="third-frame-slider-page__content___cartFOOTER_labelBrand-IMG flex">
                      <div className="third-frame-slider-page__content___cartFOOTER_labelBrand-IMG-logo bgImg" role="img" aria-label="Ethereum logo"></div>
                    </div>
                    <div className="third-frame-slider-page__content___cartFOOTER_labelBrand-DESCRIOPTION flex fd-column">
                      <span className="third-frame-slider-page__content___cartFOOTER_labelBrand-DESCRIOPTION-name">Ethereum</span>
                      <span className="third-frame-slider-page__content___cartFOOTER_labelBrand-DESCRIOPTION-date">27.07.25</span>
                    </div>
                  </div>
                  <span className="third-frame-slider-page__content___cartFOOTER_labelBrand-PERCENT">11.45%</span>
                </div>
              </div>
              <div className="third-frame-slider-page__content___cart flex fd-column">
                <div className="third-frame-slider-page__content___cartIMG bgImg" role="img" aria-label="Web3 TON Token investment chart"></div>
                <div className="third-frame-slider-page__content___cartFOOTER flex fd-row">
                  <div className="third-frame-slider-page__content___cartFOOTER_labelBrand flex fd-row">
                    <div className="third-frame-slider-page__content___cartFOOTER_labelBrand-IMG flex">
                      <div className="third-frame-slider-page__content___cartFOOTER_labelBrand-IMG-logo bgImg" role="img" aria-label="Web3 TON Token logo"></div>
                    </div>
                    <div className="third-frame-slider-page__content___cartFOOTER_labelBrand-DESCRIOPTION flex fd-column">
                      <span className="third-frame-slider-page__content___cartFOOTER_labelBrand-DESCRIOPTION-name">Web3 TON Token</span>
                      <span className="third-frame-slider-page__content___cartFOOTER_labelBrand-DESCRIOPTION-date">02.08.25</span>
                    </div>
                  </div>
                  <span className="third-frame-slider-page__content___cartFOOTER_labelBrand-PERCENT">3.25%</span>
                </div>
              </div>
            </div>
          </article>

          <article className="third-frame-slider_page slideItem flex fd-column">
            <header className="third-frame-slider-page__header flex fd-column">
              <span className="third-frame-slider-page__headerLine">Infrastructure: Custody solutions and partnerships</span>
              <span className="third-frame-slider-page__headerLine">with regulated third-party providers ensure security,</span>
              <span className="third-frame-slider-page__headerLine">reliability, and compliance.</span>
            </header>
            <div className="third-frame-slider-page__content flex fd-row">
              <div className="third-frame-slider-page__content___cart flex fd-column">
                <div className="third-frame-slider-page__content___cartIMG bgImg" role="img" aria-label="Infrastructure solutions"></div>
              </div>
              <div className="third-frame-slider-page__content___cart flex fd-column">
                <div className="third-frame-slider-page__content___cartIMG bgImg" role="img" aria-label="Custody services"></div>
              </div>
            </div>
          </article>

          <article className="third-frame-slider_page slideItem flex fd-column">
            <header className="third-frame-slider-page__header flex fd-column">
              <span className="third-frame-slider-page__headerLine">Guidance: Ongoing professional analytics, reporting,</span>
              <span className="third-frame-slider-page__headerLine">and strategy transparency keep users informed to make</span>
              <span className="third-frame-slider-page__headerLine">responsible investment decisions on their own.</span>
            </header>
            <div className="third-frame-slider-page__content flex fd-row">
              <div className="third-frame-slider-page__content___cart flex fd-column">
                <div className="third-frame-slider-page__content___cartIMG bgImg" role="img" aria-label="Professional analytics"></div>
              </div>
              <div className="third-frame-slider-page__content___cart flex fd-column">
                <div className="third-frame-slider-page__content___cartIMG bgImg" role="img" aria-label="Regular reporting"></div>
              </div>
              <div className="third-frame-slider-page__content___cart flex fd-column">
                <div className="third-frame-slider-page__content___cartIMG bgImg" role="img" aria-label="Strategy transparency"></div>
              </div>
            </div>
          </article>
        </div>

        <nav className="third-frame-slider-navPanel flex fd-row">
          <span className="third-frame-slider-navPanel_button bru brc-BW pointer navButton activePositionSlide">traditional assets</span>
          <span className="third-frame-slider-navPanel_button bru brc-BW pointer navButton">digital assets</span>
          <span className="third-frame-slider-navPanel_button bru brc-BW pointer navButton">infrastructure</span>
          <span className="third-frame-slider-navPanel_button bru brc-BW pointer navButton">guidance</span>
        </nav>
      </article>
    </section>

    <section className="main-frame flex fd-column fourthFrame smooth-scroll">
      <article className="fourth-frame-content flex fd-column preventDefault">
        <span className="fourth-frame-content-row">Strategic investing</span>
        <span className="fourth-frame-content-row">begins with awareness</span>
      </article>

      <article className="fourth-frame-content flex fd-row">
        <div className="fourth-frame-content-row-item flex fd-column preventDefault">
          <span className="fourth-frame-content-row-item-title-text">4</span>
          <span className="fourth-frame-content-row-item-subitle-text">steps to success</span>
        </div>

        <div className="fourth-frame-content-row-item flex fd-column">
          <div className="fourth-frame-content-cart flex fd-column pointer">
            <div className="fourth-frame-content-cart-title">01</div>
            <div className="fourth-frame-content-cart-header">Platform registration</div>
            <div className="fourth-frame-content-cart-text">allows users to create an account and explore the infrastructure.</div>
          </div>

          <div className="fourth-frame-content-cart flex fd-column pointer">
            <div className="fourth-frame-content-cart-title">02</div>
            <div className="fourth-frame-content-cart-header">Orientation</div>
            <div className="fourth-frame-content-cart-text">includes access to analytics, security systems, and available resources.</div>
          </div>

          <div className="fourth-frame-content-cart flex fd-column pointer">
            <div className="fourth-frame-content-cart-title">03</div>
            <div className="fourth-frame-content-cart-header">Strategy selection and analytic activation</div>
            <div className="fourth-frame-content-cart-text">help identify a personalized approach.</div>
          </div>

          <div className="fourth-frame-content-cart flex fd-column pointer">
            <div className="fourth-frame-content-cart-title">04</div>
            <div className="fourth-frame-content-cart-header">Tool integration and third-party services</div>
            <div className="fourth-frame-content-cart-text">expand opportunities for self-directed portfolio development.</div>
          </div>
        </div>
      </article>
    </section>

    <section className="main-frame flex fd-column fifthFrame smooth-scroll">
      <article className="fifth-frame-content flex fd-column">
        <div className="fifth-frame-content-description flex fd-row">
          <div className="fifth-frame-content-description-text flex fd-column">
            <div className="fifth-frame-content-description-text-row flex fd-column preventDefault">
              <span className="fifth-frame-content-description-text-TOProw">who is this</span>
              <span className="fifth-frame-content-description-text-BOTTOMrow">
                platform
                <span className="gradientText">for?</span>
              </span>
            </div>

            <a href="#" className="a-black fifth-frame_content-row_button flex fd-row pointer" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>
              become an investor
              <div className="fifth-frame_content-row_button-iconROW bgImg"></div>
            </a>
          </div>

          <div className="fifth-frame-content-slider-box flex">
            <div className="fifth-frame-content-slider slider flex fd-row">
              <article className="fifth-frame-content-slider_page slideItem flex fd-column preventDefault">
                <h5 className="fifth-frame-content-slider_page-title flex fd-column">
                  <span>Independent investors</span>
                  <span>looking to diversify</span>
                </h5>
                <div className="fifth-frame-content-slider_page-content">looking to diversify and grow their capital.</div>
                <div className="fifth-frame-content-slider_page-slideNumeric gradientText">01</div>
              </article>

              <article className="fifth-frame-content-slider_page slideItem flex fd-column preventDefault">
                <h5 className="fifth-frame-content-slider_page-title flex fd-column">
                  <span>For family</span>
                  <span>offices</span>
                </h5>
                <div className="fifth-frame-content-slider_page-content">seeking long-term wealth planning and preservation tools.</div>
                <div className="fifth-frame-content-slider_page-slideNumeric gradientText">02</div>
              </article>

              <article className="fifth-frame-content-slider_page slideItem flex fd-column preventDefault">
                <h5 className="fifth-frame-content-slider_page-title flex fd-column">
                  <span>For Web3</span>
                  <span>enthusiasts</span>
                </h5>
                <div className="fifth-frame-content-slider_page-content">engaged in blockchain innovation.</div>
                <div className="fifth-frame-content-slider_page-slideNumeric gradientText">03</div>
              </article>

              <article className="fifth-frame-content-slider_page slideItem flex fd-column preventDefault">
                <h5 className="fifth-frame-content-slider_page-title flex fd-column">
                  <span>For financial</span>
                  <span>professionals</span>
                </h5>
                <div className="fifth-frame-content-slider_page-content">managing capital actively and seeking expert analytics.</div>
                <div className="fifth-frame-content-slider_page-slideNumeric gradientText">04</div>
              </article>
            </div>
          </div>
        </div>

        <nav className="fifth-frame-slider-navPanel flex fd-row">
          <span className="fifth-frame-slider-navPanel_button bru brc-BW pointer navButton activePositionSlide">independent investors</span>
          <span className="fifth-frame-slider-navPanel_button bru brc-BW pointer navButton">family offices</span>
          <span className="fifth-frame-slider-navPanel_button bru brc-BW pointer navButton">web3 enthusiasts</span>
          <span className="fifth-frame-slider-navPanel_button bru brc-BW pointer navButton">professionals</span>
        </nav>
      </article>
    </section>

    <section className="main-frame flex fd-column sixthFrame preventDefault smooth-scroll">
      <article className="sixthFrame-content flex fd-column">
        <h3 className="sixthFrame-header">
          why choose
          <span className="gradientText">itc</span>
          ?
        </h3>
        <h4 className="sixthFrame-subtitle">We help users navigate both traditional and digital markets with diversified tools for sustainable portfolio development and risk control</h4>
        <h5 className="sixthFrame-subtitle2">Trusted by users in 30+ countries</h5>

        <div className="sixthFrame-theMap bgImg" role="img" aria-label="World map - clients from 30+ countries"></div>

        <div className="sixthFrame-description flex fd-row">
          <div className="sixthFrame-description-item flex fd-column">
            <div className="sixthFrame-description-item-title">10 years</div>
            <div className="sixthFrame-description-item-text">of operational history</div>
          </div>

          <div className="sixthFrame-description-item flex fd-column">
            <div className="sixthFrame-description-item-title">$10M+</div>
            <div className="sixthFrame-description-item-text">in total tracked capital</div>
          </div>

          <div className="sixthFrame-description-item flex fd-column">
            <div className="sixthFrame-description-item-title">300+</div>
            <div className="sixthFrame-description-item-text">satisfied clients worldwide</div>
          </div>
        </div>
      </article>
    </section>

    <section className="main-frame flex fd-column eighthFrame smooth-scroll">
      <article className="eighthFrame-content flex fd-column">
        <h3 className="eighthFrame-header flex fd-column preventDefault">
          <span>strategy</span>
          <span className="gradientText">performance</span>
        </h3>

        <h5 className="eighthFrame-subtitle TOP flex fd-column preventDefault">
          <span>Our strategies have shown consistent growth: average return</span>
          <span>increased from 17% in 2019 to 40% in 2024, supported by</span>
          <span>the rapid development of digital assets and blockchain infrastructure.</span>
        </h5>
        <h5 className="eighthFrame-subtitle flex fd-column CENTER preventDefault">
          <span>While past results are not indicative of future performance,</span>
          <span>our strategic methodology has helped users make more</span>
          <span>informed, long-term decisions.</span>
        </h5>
        <h5 className="eighthFrame-subtitle flex fd-column BOTTOM preventDefault"></h5>

        <div className="performance-indicators-box preventDefault">
          <div className="parallelepiped percent40">
            <div className="face front parallelepipedBG"><div className="gradientText">2024</div></div>
            <div className="face back parallelepipedBG"></div>
            <div className="face left parallelepipedBG"></div>
            <div className="face right parallelepipedBG"></div>
            <div className="face top parallelepipedBG"></div>
          </div>
          <div className="percent-label percent40-label">40%</div>

          <div className="parallelepiped percent32">
            <div className="face front parallelepipedBG"><div className="gradientText">2023</div></div>
            <div className="face back parallelepipedBG"></div>
            <div className="face left parallelepipedBG"></div>
            <div className="face right parallelepipedBG"></div>
            <div className="face top parallelepipedBG"></div>
          </div>
          <div className="percent-label percent32-label">32%</div>

          <div className="parallelepiped percent30">
            <div className="face front parallelepipedBG"><div className="gradientText">2022</div></div>
            <div className="face back parallelepipedBG"></div>
            <div className="face left parallelepipedBG"></div>
            <div className="face right parallelepipedBG"></div>
            <div className="face top parallelepipedBG"></div>
          </div>
          <div className="percent-label percent30-label">30%</div>

          <div className="parallelepiped percent27">
            <div className="face front parallelepipedBG"><div className="gradientText">2021</div></div>
            <div className="face back parallelepipedBG"></div>
            <div className="face left parallelepipedBG"></div>
            <div className="face right parallelepipedBG"></div>
            <div className="face top parallelepipedBG"></div>
          </div>
          <div className="percent-label percent27-label">27%</div>

          <div className="parallelepiped percent21">
            <div className="face front parallelepipedBG"><div className="gradientText">2020</div></div>
            <div className="face back parallelepipedBG"></div>
            <div className="face left parallelepipedBG"></div>
            <div className="face right parallelepipedBG"></div>
            <div className="face top parallelepipedBG"></div>
          </div>
          <div className="percent-label percent21-label">21%</div>

          <div className="parallelepiped percent17">
            <div className="face front parallelepipedBG"><div className="gradientText">2019</div></div>
            <div className="face back parallelepipedBG"></div>
            <div className="face left parallelepipedBG"></div>
            <div className="face right parallelepipedBG"></div>
            <div className="face top parallelepipedBG"></div>
          </div>
          <div className="percent-label percent17-label">17%</div>
        </div>
      </article>
    </section>


    <section className="main-frame flex fd-column eleventhFrame smooth-scroll">
      <article className="eleventhFrame-content flex fd-column">
        <h3 className="eleventhFrame-header flex fd-column">
          <span className="preventDefault">Join the international</span>
          <span className="gradientText preventDefault">investment infrastructure</span>

          <a href="#" className="a-black eleventhFrame_content-row_button flex fd-row pointer" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>
            become an investor
            <div className="eleventhFrame_content-row_button-iconROW bgImg"></div>
          </a>

          <footer className="main-footer">
            <div className="main-footer_content-row flex fd-row">
              <span className="main-footer_content-row__bottomContent bru brc-white pointer">
                <a href="./src/docs/PERSONAL_DATA_PROCESSING_AND_PRIVACY_POLICY_FOR_THE_PROVISION_.pdf" target="_blank">privacy policy</a>
              </span>
              <span className="main-footer_content-row__bottomContent bru brc-white pointer">
                <a href="./src/docs/AGREEMENT ON THE PROCEDURE FOR PROVIDING FINANCIAL SERVICES.pdf" target="_blank">terms of service</a>
              </span>
              <span className="main-footer_content-row__bottomContent bru brc-white pointer">
                <a href="./src/docs/DECLARATION_NOTICE_OF_RISKS_RELATED_TO_OPERATIONS_IN_FINANCIAL_AND.pdf" target="_blank">risk disclaimer</a>
              </span>
            </div>

            <h4 className="main-footer-content flex fd-column preventDefault">
              <span className="copyrate">&copy; INVEST TIME CAPITAL 2025</span>
              <p className="flex fd-column">
                <span className="">This platform is operated by a company registered in Hong Kong. All services</span>
                <span className="">are provided in accordance with the laws of Hong Kong.</span>
              </p>
              <p className="flex fd-column">
                <span className="">This website is intended for informational, analytical, and educational purposes only.</span>
                <span className="">It does not constitute a public offer or investment recommendation. Some users may gain</span>
                <span className="">access to integrated third-party tools or custody solutions, subject to their own jurisdictional compliance.</span>
              </p>
            </h4>

            <span className="main-footer-address flex fd-column">
              <span className="main-footer-address-text">Invest Time Capital Limited</span>
              <span className="main-footer-address-text">7/F, MW Tower, 111 Bonham</span>
              <span className="main-footer-address-text">Strand, Sheung Wan</span>
              <span className="main-footer-address-text flex fd-row">
                Hong Kong
                <div className="main-footer-address-text-flag bgImg" role="img" aria-label="Hong Kong flag"></div>
              </span>
              <span className="main-footer-address-text">Company N 3324158</span>
            </span>
          </footer>
        </h3>
      </article>
    </section>
      </>
    )
}

export default Landing
  