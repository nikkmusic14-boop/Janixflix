import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import MovieCard from '../components/MovieCard.jsx';
import { deDuplicateMovies } from '../utils.js';
import { useHistory } from '../hooks/useHistory';

const REGEX = {
  punjabi: /punjabi|jatt|singh|carry on jatta|chhal mera|sardaar|gippy|diljit|ammy|kambdi|shadaa|qismat|honsla rakh|chal mera putt/i,
  south: /hindi dubbed|south|allu arjun|ram charan|ntr|prabhas|yash|vijay|ajith|mahesh babu|dhanush|surya|karthi|ravi teja|pawan kalyan|kgf|pushpa|rrr|baahubali|salaar|leo|vijay thalapathy|ajith kumar|vikram|kamal haasan|rajinikanth|mammootty|mohanlal|dulquer salmaan|fahadh faasil|prithviraj|tovino|nani|deverakonda|chiranjeevi|naga chaitanya|akhil akkineni|rana daggubati|nitin|ram pothineni|sai dharam tej|varun tej|sharwanand|adivi sesh|vishwak sen|satyadev|nikhil siddharth|siddharth|jiiva|jayam ravi|silambarasan|santhanam|vijay sethupathi|sivakarthikeyan|arun vijay|gautham karthik|ashok selvan|harish kalyan|kavin|pradeep ranganathan|rakshit shetty|rishab shetty|raj b shetty|shiva rajkumar|kiccha sudeep|puneeth rajkumar|upendra|darshan|sudeep|ganesh|duniya vijay|sriimurali|nivin pauly|asif ali|unni mukundan|shane nigam|antony varghese|pepe|neeraj madhav|vineeth sreenivasan|dhyan sreenivasan|basil joseph|arjun das|raghava lawrence|sundeep kishan|sudheer babu|allari naresh|naga shaurya|raj tarun|kiran abbavaram|rosshan andrrews|vishnu manchu|manoj manchu|vikram prabhu|gautham vasudev menon|sj suryah|bobby simha|vijay antony|atharvaa|vikranth|vishnu vishal|vaibhav|udhayanidhi stalin|arulnithi|vidharth|manikandan|amir elam|srikanth|tarun|navdeep|uday kiran|nagarjuna|venkatesh|balakrishna|suresh gopi|jayaram|jagapathi babu|srikanth meka|darshan thoogudeepa|ramesh aravind|ravichandran|ananth nag|jaggesh|saikumar|arjun sarja|sarathkumar|prabhu ganesan|karthik muthuraman|sathyaraj|nassar|prakash raj|kota srinivasa rao|brahmanandam|ali|tanikella bharani|posani|rajendra prasad|naresh|rao ramesh|murali sharma|sunil varma|vadivelu|vivek|goundamani|senthil|karunas|soori|yogi babu|redin kingsley|jangiri madhumitha|vennela kishore|priyadarsi|rahul ramakrishna|abhinav gomatam|suhas|sandeep kishan|aadi saikumar|shanthnu|g\. v\. prakash|premgi|jai sampath|kalaiyarasan|kathir|dhananjaya|vasishta|nirup bhandari|vijay raghavendra|diganth|yogesh|sathish ninasam|chandan shetty|pratham|santhosh ananddram|ajay rao|aneesh|likith shetty|prithvi ambaar|rajavardan|dhruva sarja|abishek ambareesh|zaid khan|dheeren|yuva rajkumar|vinay rajkumar|guru rajkumar|suraj gowda|vihan gowda|karthik jayaram|chandan kumar|skanda ashok|shine shetty|bhuvan|rakesh adiga|jaganath|sujay shastry|poornachandra|nagabhushana|danish sait|ravishankar|ayyappa|avinash|achyuth kumar|sharath lohithaswa|rangayana raghu|sadhu kokila|chikkanna|kuri prathap|bullet prakash|mitra|tabla nani|honnavalli krishna|bank janardhan|tennis krishna|doddanna|mukhyamantri chandru|srinivasa murthy|jai jagadish|ramakrishna|sundar raj|pramod shetty|gopalkrishna|balaji manohar|madhusudhan|kishore kumar|rajesh nataranga|arun sagar|naveen d\. padil|bhojaraj vamanjoor|aravind bolar|sathish bandale|vineeth radhakrishnan|kunchacko boban|jayasurya|indrajith|narain|rahman|siddique|lalu alex|maniyanpilla raju|mukesh|jagadish|innocent|nedumudi venu|thilakan|murali|bharath gopy|oduvil|k\. p\. a\. c\. lalitha|mamukkoya|kuthiravattam pappu|mala aravindan|jagathy|harisree ashokan|salim kumar|suraj venjaramoodu|soubin shahir|sharaf u dheen|siju wilson|krishna shankar|sabumon|jaffer idukki|indrans|alencier|sudhi koppa|lukman avaran|naslen|mathew thomas|arjun ashokan|ganapathi|balu varghese|sreenath bhasi|shine tom chacko|sunny wayne|chemban vinod|vinayakan|joju george|biju menon|amith chakalakkal|saiju kurup|rony david|deepak parambol|shabareesh|nobel babu|aju varghese|vineeth mohan|bhagath manuel|arun kurian|sarjano khalid|roshan mathew|devanathan|pranav mohanlal|kalyani priyadarshan|gokul suresh|anoop menon|murali gopy|shankar ramakrishnan|renji panicker|joy mathew|suresh krishna|baburaj|shammi thilakan|hareesh peradi|sudev nair|vishnu unnikrishnan|bibin george|dharmajan|pashanam shaji|ramesh pisharody|tini tom|kottayam nazeer|guinness pakru|siddharth bharathan|musthafa|suhail nayyar|anaswara rajan|arjun gopal|saju navodaya|bijukuttan|nelson sooranad|kollam sudhi|subish|nirmal palazhi|hareesh kanaran|appani sarath|sreejith ravi|spadikam george|abu salim|kundara johny|bheeman raghu|kazan khan|riyaz khan|t\. g\. ravi|sathaar|jose prakash|k\. p\. ummer|n\. n\. pillai|rajan p\. dev|narendra prasad|ratish|sukumaran|m\. g\. soman|jayan|vincent|raghavan|sudheer|raveendran|deven|captain raju|kollam thulasi|manochitra|augustine|sadiq|kunchan|idavela babu|chali pala|sivaji|irshad|kalasala babu|saju kodiyan|thesni khan|ponnamma babu|philomina|sukumari|kaviyoor ponnamma|aranmula ponnamma|valsala menon|meena|zeenath|santhakumari|sreelatha namboothiri|kulappulli leela|manka mahesh|sethulakshmi|pauly valsan|sujatha|subbalakshmi|ranganathan|arun kumar|santhosh keezhattoor|sreekanth murali|manojan|suresh babu|prem kumar|v\. k\. sreeraman|m\. r\. gopakumar|nandu|kishore|makarand deshpande|pavitran|razaak|abbas|prabhu deva|raju sundaram|nagendra prasad|tarun master|shiva|rj balaji|janagaraj|s\. s\. chandran|loose mohan|venniradai moorthy|charlie|chinini jayanth|dhamu|vaiyapuri|pugazh|bala|kpy bala|ramkumar|dushyanth|shivaji dev|junior mgr|mgr ramachandran|janaki ramachandran|deepak jayakumar|deepan chakravarthy|shanmugha pandian|vijayakanth|prabhakaran|akash murali|brinda sivakumar|sivakumar|sanjay vijay|jason sanjay|dhruv vikram|akshita vikram|prashanth|thiagarajan|adithya thiagarajan|chiranjeevi sarja|suraj sarja|aishwarya sarja|anjana sarja|bharat sarja|pavan sarja|sudeep sanjeev|sanchith sanjeev|upendra rao|niranjan sudhindra|priyanka upendra|niharika|manoranjan|hamsalekha|manojav|golden star ganesh|shekhar ganesh|preetham ganesh|samrat vijay|monisha vijay|anand murali|roopa murali|sai kumar pudipeddi|p\. ravi shankar|adi saikumar|guru jaggesh|yathiraj jaggesh|komal kumar|shankar nag|arundhati nag|kavitha nag|nandamuri|kalyan ram|taraka ratna|hari krishna|suhasini|nagendra babu|vaishnav tej|allu aravind|allu sirish|allu venkatesh|akkineni nageswara rao|akkineni nagarjuna|akkineni naga chaitanya|sumanth yarlagadda|sushanth anumolu|daggubati venkatesh|daggubati suresh babu|abhiram daggubati|krishna ghattamaneni|ramesh babu|manjula ghattamaneni|priyadarsini|gautham ghattamaneni|sitara ghattamaneni|mohan babu|lakshmi manchu|avram manchu|vidhya nirvana|roshan meka|rohan meka|medha meka|gadde balakrishna|gadde bobby/i,
  hollywood: /avengers|batman|spider-man|superman|iron man|deadpool|x-men|marvel|dc|fast and furious|mission impossible|john wick|matrix|jurassic|star wars|harry potter|transformers/i,
  southFalsePositives: /south park|southpaw|south of|journey to the south|south pacific|south central|south bound|southbound|south side|southside|south pole|south korea|south african|south park/i
};

const isCleanPunjabi = (m) => {
  const t = m.title ? m.title.toLowerCase() : '';
  if (/(hindi dubbed|south|hollywood)/.test(t)) return false;
  return true;
};

const isCleanMovies = (m) => {
  const t = m.title ? m.title.toLowerCase() : '';
  if (REGEX.punjabi.test(t)) return false;
  if (REGEX.hollywood.test(t)) return false;
  return true;
};

const isCleanHollywood = (m) => {
  const t = m.title ? m.title.toLowerCase() : '';
  if (/(hindi dubbed|bollywood|punjabi|south indian|telugu|tamil|malayalam)/.test(t)) return false;
  if (REGEX.southFalsePositives.test(t)) return false;
  return true;
};

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  
  // Read active category directly from URL params: 'home' | 'bollywood' | 'southindian' | 'punjabi' | 'hollywood' | 'webseries' | 'tvshows' | 'anime'
  const activeTab = searchParams.get('tab') || 'home';
  
  const { viewHistory } = useHistory();
  
  // Server selection state
  const [activeServer, setActiveServer] = useState(activeTab === 'anime' ? 'server2' : 'server1');
  
  // Catalog contents
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [allMovies, setAllMovies] = useState([]);
  const [lastApiPageFetched, setLastApiPageFetched] = useState(-1);

  // Home category content feeds
  const [homeMovies, setHomeMovies] = useState([]);
  const [homePunjabi, setHomePunjabi] = useState([]);
  const [homeHollywood, setHomeHollywood] = useState([]);
  const [homeIndianWebSeries, setHomeIndianWebSeries] = useState([]);
  const [homeHollywoodTV, setHomeHollywoodTV] = useState([]);
  const [homeKorean, setHomeKorean] = useState([]);
  const [homeAnime, setHomeAnime] = useState([]);

  // Search result states
  const [searchLoading, setSearchLoading] = useState(false);
  const [netmirrorResults, setNetmirrorResults] = useState([]);
  const [hicineResults, setHicineResults] = useState([]);

  // Reset page and active server when category changes in URL
  useEffect(() => {
    const defaultServer = activeTab === 'anime' ? 'server2' : 'server1';
    const isSeries = activeTab === 'indianwebseries' || activeTab === 'indiantvshows' || activeTab === 'hollywoodtvshows' || activeTab === 'webseries' || activeTab === 'tvshows';
    const startPage = (defaultServer === 'server2' && isSeries) ? 1 : 0;
    setActiveServer(defaultServer);
    setPage(startPage);
    setAllMovies([]);
    setLastApiPageFetched(startPage - 1);
  }, [activeTab]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  // Handle server switching
  const handleServerChange = (server) => {
    setActiveServer(server);
    const isSeries = activeTab === 'indianwebseries' || activeTab === 'indiantvshows' || activeTab === 'hollywoodtvshows' || activeTab === 'webseries' || activeTab === 'tvshows';
    const startPage = (server === 'server2' && isSeries) ? 1 : 0;
    setPage(startPage);
    setAllMovies([]);
    setLastApiPageFetched(startPage - 1);
  };

  // 1. Unified Search Logic
  useEffect(() => {
    if (q) {
      setSearchLoading(true);
      setError('');
      
      Promise.all([
        api.external.netmirror.search(q).then(res => res.results || []).catch(() => []),
        api.external.hicine.search(q).catch(() => [])
      ]).then(([netmirror, hicine]) => {
        setNetmirrorResults(deDuplicateMovies(netmirror).map(m => ({ ...m, source: 'netmirror' })));
        setHicineResults(deDuplicateMovies(hicine));
        setSearchLoading(false);
      }).catch(err => {
        setError(err.message);
        setSearchLoading(false);
      });
    }
  }, [q]);

  // 2. Fetch category listings
  useEffect(() => {
    if (q) return;

    let cancelled = false;
    setLoading(true);
    setError('');

    const loadCategory = async () => {
      try {
        let results = [];

        if (activeTab === 'home') {
          const [
            bollyRes,
            punjabiRes,
            hollyRes,
            indWebRes,
            hollyTvRes,
            koreanRes,
            animeRes,
            southRes
          ] = await Promise.allSettled([
            api.external.netmirror.list({ type: '1', cn: 'India', page: 1 }),
            Promise.all([
              api.external.hicine.search('Punjabi'),
              api.external.hicine.search('Jatt'),
              api.external.hicine.search('Singh')
            ]).then(([a,b,c]) => [...(Array.isArray(a)?a:[]), ...(Array.isArray(b)?b:[]), ...(Array.isArray(c)?c:[])]),
            api.external.netmirror.list({ type: '1', cn: 'US', page: 1 }),
            api.external.netmirror.list({ type: '2', cn: 'India', page: 1 }),
            api.external.netmirror.list({ type: '2', cn: 'US', page: 1 }),
            api.external.netmirror.list({ cn: 'Korea', page: 1 }),
            api.external.hicine.search('Anime'), // Server 1 search is broken, fallback to Server 2
            api.external.hicine.search('South') // Server 1 merges with Bollywood, use Server 2
          ]);
          if (cancelled) return;
          
          const getRes = (res) => (res && res.status === 'fulfilled' && res.value && res.value.results) ? res.value.results : (res && res.status === 'fulfilled' && Array.isArray(res.value)) ? res.value : [];

          const combinedMovies = [
            ...(getRes(bollyRes)).map(m => ({ ...m, source: 'netmirror' })),
            ...(getRes(southRes)).map(m => ({ ...m, source: 'hicine' }))
          ];
          setHomeMovies(deDuplicateMovies(combinedMovies).filter(isCleanMovies).slice(0, 10));
          setHomePunjabi(deDuplicateMovies(getRes(punjabiRes)).map(m => ({ ...m, source: 'hicine' })).filter(isCleanPunjabi).slice(0, 10));
          setHomeHollywood(deDuplicateMovies(getRes(hollyRes)).map(m => ({ ...m, source: 'netmirror' })).filter(isCleanHollywood).slice(0, 10));
          
          setHomeIndianWebSeries(deDuplicateMovies(getRes(indWebRes)).map(m => ({ ...m, source: 'netmirror' })).slice(0, 10));
          setHomeHollywoodTV(deDuplicateMovies(getRes(hollyTvRes)).map(m => ({ ...m, source: 'netmirror' })).slice(0, 10));
          setHomeKorean(deDuplicateMovies(getRes(koreanRes)).map(m => ({ ...m, source: 'netmirror' })).slice(0, 10));
          
          let animeMovies = deDuplicateMovies(getRes(animeRes))
            .map(m => ({ ...m, source: 'hicine' }))
            .filter(m => {
              const t = m.title.toLowerCase();
              return !t.includes('anime supremacy') && 
                     !t.includes('chô jigen kakumei anime') &&
                     !t.includes('kaun kitney paani mein') &&
                     !t.includes('leanne morgan');
            }).slice(0, 10);
          setHomeAnime(animeMovies);

          setMovies([]);
          setLoading(false);
          return;
        }

        const isSeries = activeTab === 'indianwebseries' || activeTab === 'indiantvshows' || activeTab === 'hollywoodtvshows' || activeTab === 'webseries' || activeTab === 'tvshows';
        const startPage = (activeServer === 'server2' && isSeries) ? 1 : 0;

        let targetCount = 27;
        let startIndex = 0;
        if (page > startPage) {
          const k = page - startPage;
          targetCount = 27 + k * 18;
          startIndex = 27 + (k - 1) * 18;
        }
        const endIndex = targetCount;

        let tempAllMovies = [...allMovies];
        let currentLastApi = lastApiPageFetched;

        if (tempAllMovies.length < targetCount) {
          let apiPagePointer = lastApiPageFetched + 1;
          let attempts = 0;
          
          while (tempAllMovies.length < targetCount && attempts < 5) {
            let newItems = [];
                        if (activeServer === 'server1') {
              const params = { page: apiPagePointer };
              
              if (activeTab === 'movies') {
                const [bollyData, southData] = await Promise.all([
                  api.external.netmirror.list({ type: '1', cn: 'India', page: apiPagePointer }),
                  api.external.hicine.search('South', apiPagePointer)
                ]);
                if (cancelled) return;
                const combinedMovies = [
                  ...(bollyData.results || []).map(m => ({ ...m, source: 'netmirror' })),
                  ...(Array.isArray(southData) ? southData : []).map(m => ({ ...m, source: 'hicine' }))
                ];
                newItems = combinedMovies.filter(isCleanMovies);
              } else if (activeTab === 'punjabi') {
                if (apiPagePointer === 0) {
                  const [d1, d2, d3, d4] = await Promise.all([
                    api.external.hicine.search('Punjabi'),
                    api.external.hicine.search('Jatt'),
                    api.external.hicine.search('Singh'),
                    api.external.hicine.search('Carry on')
                  ]);
                  const allData = [
                    ...(Array.isArray(d1) ? d1 : []),
                    ...(Array.isArray(d2) ? d2 : []),
                    ...(Array.isArray(d3) ? d3 : []),
                    ...(Array.isArray(d4) ? d4 : [])
                  ];
                  newItems = allData.map(m => ({ ...m, source: 'hicine' })).filter(isCleanPunjabi);
                } else {
                  newItems = [];
                }
              } else if (activeTab === 'hollywood') {
                params.type = '1';
                params.cn = 'US';
                const data = await api.external.netmirror.list(params);
                if (cancelled) return;
                newItems = (data.results || []).map(m => ({ ...m, source: 'netmirror' })).filter(isCleanHollywood);
              } else if (activeTab === 'webseries') {
                params.type = '2';
                const data = await api.external.netmirror.list(params);
                if (cancelled) return;
                newItems = (data.results || []).map(m => ({ ...m, source: 'netmirror' }));
              } else if (activeTab === 'indiantvshows') {
                params.type = '2';
                params.cn = 'India';
                const data = await api.external.netmirror.list(params);
                if (cancelled) return;
                newItems = (data.results || []).map(m => ({ ...m, source: 'netmirror' }));
              } else if (activeTab === 'hollywoodtvshows') {
                params.type = '2';
                params.cn = 'US';
                const data = await api.external.netmirror.list(params);
                if (cancelled) return;
                newItems = (data.results || []).map(m => ({ ...m, source: 'netmirror' }));
              } else if (activeTab === 'korean') {
                params.cn = 'Korea';
                const data = await api.external.netmirror.list(params);
                if (cancelled) return;
                newItems = (data.results || []).map(m => ({ ...m, source: 'netmirror' }));
              }
            } else {
              let categoryKey = activeTab;
              if (activeTab === 'movies') categoryKey = 'bollywood';
              if (activeTab === 'home' || !activeTab) categoryKey = 'bollywood';
              else if (activeTab === 'indiantvshows') categoryKey = 'indianwebseries';
              else if (activeTab === 'hollywoodtvshows') categoryKey = 'hollywoodtvshows';

              const data = await api.external.hicine.list(categoryKey, apiPagePointer);
              if (cancelled) return;
              newItems = (Array.isArray(data) ? data : (data.results || []));
              
              if (activeTab === 'movies') {
                 newItems = newItems.filter(isCleanMovies);
              } else if (activeTab === 'punjabi') {
                if (apiPagePointer === 0) {
                  const [d1, d2, d3, d4] = await Promise.all([
                    api.external.hicine.search('Punjabi'),
                    api.external.hicine.search('Jatt'),
                    api.external.hicine.search('Singh'),
                    api.external.hicine.search('Carry on')
                  ]);
                  const allData = [
                    ...(Array.isArray(d1) ? d1 : []),
                    ...(Array.isArray(d2) ? d2 : []),
                    ...(Array.isArray(d3) ? d3 : []),
                    ...(Array.isArray(d4) ? d4 : [])
                  ];
                  newItems = allData.map(m => ({ ...m, source: 'hicine' })).filter(isCleanPunjabi);
                } else {
                  newItems = [];
                }
              } else if (activeTab === 'hollywood') {
                 newItems = newItems.filter(isCleanHollywood);
              } else if (activeTab === 'anime') {
                newItems = newItems.filter(m => {
                  const t = m.title.toLowerCase();
                  return !t.includes('anime supremacy') && 
                         !t.includes('chô jigen kakumei anime') &&
                         !t.includes('kaun kitney paani mein') &&
                         !t.includes('leanne morgan');
                });
              }
            }

            if (newItems.length === 0) {
              break;
            }

            tempAllMovies = deDuplicateMovies([...tempAllMovies, ...newItems]);
            currentLastApi = apiPagePointer;
            apiPagePointer++;
            attempts++;
          }
          
          tempAllMovies.sort((a, b) => {
             const getDate = (m) => {
               if (!m) return 0;
               if (m.release_date) {
                 const d = new Date(m.release_date);
                 if (!isNaN(d.getTime())) return d.getTime();
               }
               if (m.year) {
                 const d = new Date(m.year.toString());
                 if (!isNaN(d.getTime())) return d.getTime();
               }
               return 0;
             };
             return getDate(b) - getDate(a);
          });
          
          setAllMovies(tempAllMovies);
          setLastApiPageFetched(currentLastApi);
        }

        const pageItems = tempAllMovies.slice(startIndex, endIndex);
        setMovies(pageItems);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    loadCategory();
    return () => { cancelled = true; };
  }, [activeTab, activeServer, page, q]);

  // Search layout view
  if (q) {
    if (searchLoading) return <div className="loading" style={{ paddingTop: '100px' }}>Searching stream servers…</div>;
    return (
      <div style={{ paddingTop: '100px', minHeight: '80vh' }}>
        <div className="row">
          <h2 style={{ marginBottom: 24 }}>Search Results for "{q}"</h2>

          {/* Server 1 results */}
          <div style={{ marginBottom: 40 }}>
            <h3 style={{ borderLeft: '4px solid #0070f3', paddingLeft: 10, marginBottom: 16 }}>Global Streams (Server 1)</h3>
            {netmirrorResults.length ? (
              <div className="row-grid">
                {netmirrorResults.map((m) => <MovieCard key={m.id} movie={m} />)}
              </div>
            ) : (
              <p style={{ color: 'var(--text-dim)', paddingLeft: 14 }}>No matches in global streams.</p>
            )}
          </div>

          {/* Server 2 results */}
          <div style={{ marginBottom: 40 }}>
            <h3 style={{ borderLeft: '4px solid #00a000', paddingLeft: 10, marginBottom: 16 }}>Premium Streams (Server 2)</h3>
            {hicineResults.length ? (
              <div className="row-grid">
                {hicineResults.map((m) => <MovieCard key={m.id} movie={m} />)}
              </div>
            ) : (
              <p style={{ color: 'var(--text-dim)', paddingLeft: 14 }}>No matches in premium streams.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const categoryTitles = {
    movies: '🎬 Movies',
    punjabi: 'Punjabi Movies Feed',
    hollywood: 'Hollywood Movies',
    webseries: 'Web Series',
    indiantvshows: 'Indian TV Shows',
    hollywoodtvshows: 'US Hollywood TV',
    korean: 'Korean Drama & Movies'
  };

  const isServer2Series = activeServer === 'server2' && (
    activeTab === 'indianwebseries' ||
    activeTab === 'indiantvshows' ||
    activeTab === 'hollywoodtvshows' ||
    activeTab === 'webseries' ||
    activeTab === 'tvshows'
  );

  const startPage = isServer2Series ? 1 : 0;

  function serverButtonStyle(active, color) {
    return {
      padding: '10px 20px',
      borderRadius: '6px',
      border: 'none',
      background: active ? color : 'rgba(255,255,255,0.05)',
      color: active ? '#fff' : '#888',
      cursor: 'pointer',
      fontWeight: 'bold',
      transition: 'all 0.2s'
    };
  }

  return (
    <div style={{ paddingTop: '100px' }}>
      {/* Sub-tabs for Server Selection */}
      {!loading && !error && activeTab !== 'home' && (
        <div className="filters-bar" style={{ 
          padding: '16px 48px 0', 
          display: 'flex', 
          justifyContent: 'center',
          gap: '12px' 
        }}>
          <button
            onClick={() => handleServerChange('server1')}
            style={serverButtonStyle(activeServer === 'server1', '#0070f3')}
          >
            ⚡ Stream Server 1 (FHD)
          </button>
          <button
            onClick={() => handleServerChange('server2')}
            style={serverButtonStyle(activeServer === 'server2', '#00a000')}
          >
            🔥 Stream Server 2 (HD)
          </button>
        </div>
      )}

      {/* Catalog Render View */}
      {loading ? (
        <div className="loading">Loading titles…</div>
      ) : error ? (
        <div className="empty-state">
          <h2>Could not load database</h2>
          <p>{error}</p>
        </div>
      ) : (
        <div className="catalog-container">
          {activeTab === 'home' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', marginTop: '10px' }}>
              
              {/* Row 1: 🕒 Recently Viewed */}
              {viewHistory && viewHistory.length > 0 && (
                <div>
                  <h3 style={{ borderLeft: '4px solid #ff007f', paddingLeft: '12px', fontSize: '18px', margin: '0 48px 10px' }}>
                    🕒 Recently Viewed
                  </h3>
                  <div className="home-row" style={{ overflowX: 'auto', display: 'flex', gap: '16px', padding: '0 48px 16px', scrollbarWidth: 'thin' }}>
                    {viewHistory.map((m) => (
                      <div key={m.id} style={{ minWidth: '160px', width: '160px', flexShrink: 0 }}>
                        <MovieCard movie={m} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Row 2: 🎬 Bollywood Movies */}
              {/* Row 2: 🎬 Movies */}
              {homeMovies.length > 0 && (
                <div>
                  <h3 style={{ borderLeft: '4px solid #ff007f', paddingLeft: '12px', fontSize: '18px', margin: '0 48px 10px' }}>
                    🎬 Movies
                  </h3>
                  <div className="home-row">
                    {homeMovies.map((m) => (
                      <MovieCard key={m.id} movie={m} />
                    ))}
                  </div>
                </div>
              )}

              {/* Row 3: 👳 Punjabi Movies */}
              {homePunjabi.length > 0 && (
                <div>
                  <h3 style={{ borderLeft: '4px solid #ffcc00', paddingLeft: '12px', fontSize: '18px', margin: '0 48px 10px' }}>
                    👳 Punjabi Movies
                  </h3>
                  <div className="home-row">
                    {homePunjabi.map((m) => (
                      <MovieCard key={m.id} movie={m} />
                    ))}
                  </div>
                </div>
              )}

              {/* Row 4: 🇺🇸 Hollywood Movies */}
              {homeHollywood.length > 0 && (
                <div>
                  <h3 style={{ borderLeft: '4px solid #f30000', paddingLeft: '12px', fontSize: '18px', margin: '0 48px 10px' }}>
                    🇺🇸 Hollywood Movies
                  </h3>
                  <div className="home-row">
                    {homeHollywood.map((m) => (
                      <MovieCard key={m.id} movie={m} />
                    ))}
                  </div>
                </div>
              )}

              {/* Row 3: 📺 Indian Web Series */}
              {homeIndianWebSeries.length > 0 && (
                <div>
                  <h3 style={{ borderLeft: '4px solid #00f3ff', paddingLeft: '12px', fontSize: '18px', margin: '0 48px 10px', textShadow: '0 0 10px rgba(0, 243, 255, 0.3)' }}>
                    📺 Indian Web Series
                  </h3>
                  <div className="home-row">
                    {homeIndianWebSeries.map((m) => (
                      <MovieCard key={m.id} movie={m} />
                    ))}
                  </div>
                </div>
              )}

              {/* Row 6: 🗽 Hollywood TV Shows */}
              {homeHollywoodTV.length > 0 && (
                <div>
                  <h3 style={{ borderLeft: '4px solid #a300cc', paddingLeft: '12px', fontSize: '18px', margin: '0 48px 10px' }}>
                    🗽 Hollywood TV Shows
                  </h3>
                  <div className="home-row">
                    {homeHollywoodTV.map((m) => (
                      <MovieCard key={m.id} movie={m} />
                    ))}
                  </div>
                </div>
              )}

              {/* Row 7: 🎎 Korean Dramas */}
              {homeKorean.length > 0 && (
                <div>
                  <h3 style={{ borderLeft: '4px solid #ff66b2', paddingLeft: '12px', fontSize: '18px', margin: '0 48px 10px' }}>
                    🎎 Korean Dramas & Movies
                  </h3>
                  <div className="home-row">
                    {homeKorean.map((m) => (
                      <MovieCard key={m.id} movie={m} />
                    ))}
                  </div>
                </div>
              )}

              {/* Row 8: ⛩️ Anime */}
              {homeAnime.length > 0 && (
                <div>
                  <h3 style={{ borderLeft: '4px solid #ff9f43', paddingLeft: '12px', fontSize: '18px', margin: '0 48px 10px' }}>
                    ⛩️ Anime
                  </h3>
                  <div className="home-row">
                    {homeAnime.map((m) => (
                      <MovieCard key={m.id} movie={m} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : movies.length > 0 ? (
            <div>
              {/* Featured Banner at page 0 */}
              {((activeServer === 'server2' && isServer2Series) ? page === 1 : page === 0) && movies[0] && (
                <div style={{
                  position: 'relative',
                  minHeight: 'clamp(280px, 40vw, 380px)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  marginBottom: '40px',
                  background: `linear-gradient(90deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.85) 45%, rgba(0, 0, 0, 0.4) 100%), url(${movies[0].backdrop_path || movies[0].image || movies[0].thumbnail || 'https://images.unsplash.com/photo-1574375927938-d5a98e8edd86?q=80&w=1000'}) no-repeat center/cover`,
                  border: '1px solid rgba(0, 243, 255, 0.15)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.9), 0 0 15px rgba(0, 243, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'clamp(20px, 4vw, 40px)',
                  gap: 'clamp(12px, 3vw, 30px)',
                  flexWrap: 'nowrap'
                }}>
                  <div style={{ flex: '1 1 180px', zIndex: 2 }}>
                    <span style={{ 
                      background: 'rgba(0, 243, 255, 0.15)', 
                      border: '1px solid var(--cyan)',
                      color: 'var(--cyan)', 
                      padding: '4px 10px', 
                      borderRadius: '4px', 
                      fontSize: 'clamp(9px, 2vw, 11px)', 
                      fontWeight: 'bold',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      textShadow: '0 0 8px var(--cyan)',
                      display: 'inline-block'
                    }}>
                      ⚡ FEATURED STREAM
                    </span>
                    <h1 style={{ 
                      fontSize: 'clamp(20px, 4vw, 38px)', 
                      fontFamily: 'Outfit, sans-serif', 
                      color: '#fff', 
                      margin: '10px 0 12px 0',
                      textShadow: '0 2px 12px rgba(0,0,0,0.8)',
                      lineHeight: '1.2'
                    }}>
                      {movies[0].title}
                    </h1>
                    <p style={{ 
                      color: 'var(--text-dim)', 
                      fontSize: 'clamp(11px, 2vw, 13.5px)', 
                      lineHeight: '1.5',
                      marginBottom: 'clamp(16px, 3vw, 28px)',
                      display: '-webkit-box',
                      WebkitLineClamp: '3',
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textShadow: '0 1px 4px rgba(0,0,0,0.8)'
                    }}>
                      Stream this title in high definition with instant server caching. Experience seamless dual-audio options and custom streaming capabilities exclusively on JaNixFlix.
                    </p>
                    <button 
                      onClick={() => {
                        const m = movies[0];
                        const path = m.source === 'netmirror'
                          ? `/watch/${m.id}?source=netmirror&type=${m.media_type || 'movie'}&subjectid=${m.id}&dp=${encodeURIComponent(m.dp || '')}&title=${encodeURIComponent(m.title)}`
                          : `/watch/${m.id}?source=hicine&href=${encodeURIComponent(m.href || m.path)}&title=${encodeURIComponent(m.title)}`;
                        navigate(path);
                      }}
                      style={{
                        background: 'linear-gradient(90deg, var(--cyan) 0%, #00bcff 100%)',
                        color: '#000',
                        border: 'none',
                        padding: 'clamp(8px, 2vw, 12px) clamp(16px, 3vw, 28px)',
                        borderRadius: '6px',
                        fontSize: 'clamp(12px, 2vw, 14px)',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        boxShadow: '0 0 15px rgba(0, 243, 255, 0.45)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      ▶ Play Title
                    </button>
                  </div>
                  
                  {/* Featured Anime Image Box on the Right */}
                  <div style={{
                    flex: '0 0 auto',
                    zIndex: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    pointerEvents: 'none'
                  }}>
                    <div style={{
                      width: 'clamp(110px, 28vw, 180px)',
                      height: 'clamp(160px, 40vw, 260px)',
                      borderRadius: '8px',
                      border: '2px solid rgba(0, 243, 255, 0.4)',
                      boxShadow: '0 10px 30px rgba(0, 243, 255, 0.2)',
                      overflow: 'hidden',
                      background: '#0a0b1e'
                    }}>
                      <img 
                        src={movies[0].poster_path || movies[0].thumbnail || movies[0].backdrop_path || movies[0].image || 'https://images.unsplash.com/photo-1574375927938-d5a98e8edd86?q=80&w=1000'} 
                        alt={movies[0].title}
                        loading="lazy"
                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1574375927938-d5a98e8edd86?q=80&w=1000'; }}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>
                {categoryTitles[activeTab]} ({activeServer === 'server1' || activeTab === 'japanese' ? 'Server 1' : 'Server 2'}) — Page {isServer2Series ? page : (page + 1)}
              </h2>
              
              <div className="movie-grid">
                {movies.map((m) => (
                  <MovieCard key={m.id} movie={m} />
                ))}
              </div>
              
              {/* Pagination Controls */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '20px',
                marginTop: '48px',
                paddingBottom: '20px'
              }}>
                <button
                  onClick={() => {
                    if (page > startPage) setPage(page - 1);
                  }}
                  disabled={page === startPage}
                  className="btn"
                  style={paginationButtonStyle(page === startPage)}
                >
                  ← Previous Page
                </button>
                <span style={{ fontSize: '15px', fontWeight: 'bold' }}>
                  Page {isServer2Series ? page : (page + 1)}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={movies.length < (page === startPage ? 27 : 18)}
                  className="btn"
                  style={paginationButtonStyle(movies.length < (page === startPage ? 27 : 18))}
                >
                  Next Page →
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <h2>No titles found</h2>
              <p>No content resolved in this server category.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// INLINE STYLING HELPERS
// ────────────────────────────────────────────────────────────

function serverButtonStyle(isActive, activeColor) {
  return {
    background: isActive ? activeColor : '#222',
    color: '#fff',
    border: isActive ? `1px solid ${activeColor}` : '1px solid #444',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    outline: 'none',
    boxShadow: isActive ? `0 4px 10px ${activeColor}30` : 'none'
  };
}

function paginationButtonStyle(disabled) {
  return {
    background: disabled ? '#222' : '#fff',
    color: disabled ? '#555' : '#000',
    cursor: disabled ? 'default' : 'pointer',
    border: 'none',
    padding: '8px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    opacity: disabled ? 0.5 : 1,
    borderRadius: '4px'
  };
}
