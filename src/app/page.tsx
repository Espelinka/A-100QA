"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import { useRouter } from "next/navigation";
import pb from "@/lib/pb";
import {
  Compass,
  Home,
  Layers,
  PaintRoller,
  LayoutGrid,
  AppWindow,
  ChevronRight,
  User,
  FileText,
  Search,
  Sparkles,
  ArrowRight,
  X,
  Send,
  Bot,
  Ruler,
  AlignLeft,
  Star
} from "lucide-react";
import { PLASTERING_DOC_TEXT } from "./document-data";

export default function Page() {
  const router = useRouter();
  const [expandedTab, setExpandedTab] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [allDocsSearch, setAllDocsSearch] = useState("");

  // Modals state
  const [selectedSubSection, setSelectedSubSection] = useState<{title: string, description: string, id?: string, hasDoc?: boolean} | null>(null);
  const [viewingDescription, setViewingDescription] = useState(false);
  const [descriptionContent, setDescriptionContent] = useState<{title: string, text: string} | null>(null);

  // Navigation & Favorites state
  const [currentTab, setCurrentTab] = useState<'home' | 'all-docs' | 'favorites' | 'profile'>('home');
  const [favorites, setFavorites] = useState<string[]>([]);

  // Auth State
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [parseTarget, setParseTarget] = useState("shtukaturka");

  useEffect(() => {
    // Initial user load
    setUser(pb.authStore.model);
    
    // Subscribe to auth changes
    const unsubscribe = pb.authStore.onChange((token, model) => {
      setUser(model);
    });

    return () => unsubscribe();
  }, []);

  // Load favorites from DB
  useEffect(() => {
    if (user && user.favorites) {
      setFavorites(Array.isArray(user.favorites) ? user.favorites : []);
    } else {
      setFavorites([]);
    }
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsAuthLoading(true);

    try {
      if (authMode === 'login') {
        await pb.collection('users').authWithPassword(email, password);
      } else {
        await pb.collection('users').create({
          email,
          password,
          passwordConfirm: password,
        });
        // Auto-login after register
        await pb.collection('users').authWithPassword(email, password);
      }
      setEmail("");
      setPassword("");
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || "Ошибка авторизации. Проверьте данные.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    pb.authStore.clear();
    setUser(null);
  };

  const toggleFavorite = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      alert("Войдите в аккаунт (вкладка Профиль), чтобы сохранять в Избранное.");
      return;
    }

    const newFavorites = favorites.includes(docId) 
      ? favorites.filter(id => id !== docId) 
      : [...favorites, docId];
    
    setFavorites(newFavorites);

    try {
      const updatedUser = await pb.collection('users').update(user.id, {
        favorites: newFavorites
      });
      // Синхронизируем состояние юзера, чтобы эффекты не перезатерли избранное
      pb.authStore.save(pb.authStore.token, updatedUser);
      setUser(updatedUser);
    } catch (err: any) {
      console.error("Failed to save favorite:", err);
      setFavorites(favorites);
      alert("Ошибка сохранения в базу данных: " + err.message);
    }
  };

  // Modal history state for native swipe back
  useEffect(() => {
    const handlePopState = () => {
      setSelectedSubSection(null);
      setViewingDescription(false);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openSubSectionModal = (sub: any) => {
    window.history.pushState({ modal: true }, "");
    setSelectedSubSection(sub);
  };

  const closeModals = () => {
    window.history.back();
  };

  const openDescriptionModal = (content: any) => {
    window.history.pushState({ modal: true }, "");
    setDescriptionContent(content);
    setViewingDescription(true);
  };

  const controlSections = [
    { 
      title: "Сборные железобетонные конструкции", 
      id: "zhbi",
      icon: Home, 
      hasDoc: false,
      subSections: [
        { title: "Наружные стеновые панели", docTitle: "СТБ 1185 99 Панели стеновые наружные бетонные и железобетонные_для", id: "paneli_naruzhnie", hasDoc: true, description: "Монтаж наружных стеновых панелей должен выполняться с соблюдением требований к герметизации стыков, пространственной геометрии и надежности анкеровки." },
        { title: "Внутренние стеновые панели", id: "paneli_vnutrennie", hasDoc: false, description: "Требования к установке внутренних несущих и ненесущих панелей, включая допуски по вертикальности и качеству сварных соединений." },
        { title: "Плиты перекрытия", id: "plity", hasDoc: false, description: "Правила укладки плит перекрытия, опирания на несущие конструкции и заделки швов между плитами." }
      ]
    },
    { title: "Монолитные конструкции", id: "monolit", icon: Layers, hasDoc: false, description: "Требования к опалубочным, арматурным и бетонным работам при возведении монолитных железобетонных конструкций." },
    { title: "Штукатурные работы", docTitle: "СП 1.03.01-2019 Отделочные работы", id: "shtukaturka", icon: PaintRoller, hasDoc: true, description: "Правила подготовки поверхностей, нанесения штукатурных слоев и требования к качеству готового штукатурного покрытия." },
    { title: "Работы по устройству полов (стяжка)", id: "poly", icon: LayoutGrid, hasDoc: false, description: "Технические требования к устройству стяжек, звуко- и теплоизоляции полов, а также контроль ровности поверхности." },
    { 
      title: "Остекление", 
      id: "osteklenie",
      icon: AppWindow, 
      hasDoc: false, 
      description: "Нормативы по монтажу светопрозрачных конструкций, герметизации монтажных швов и регулировке фурнитуры.",
      subSections: [
        { title: "Стекло", id: "steklo", hasDoc: false, description: "Требования к качеству стекла, отсутствию дефектов, царапин и искажений." },
        { title: "ПВХ профиль", id: "pvh", hasDoc: false, description: "Контроль качества профиля, армирования, сварных швов и уплотнителей." },
        { title: "Подоконная доска", id: "podokonnik", hasDoc: false, description: "Правила установки подоконников, заделки швов и обеспечения уклона." },
        { title: "Отливы", id: "otlivy", hasDoc: false, description: "Требования к монтажу наружных отливов, герметизации и шумоизоляции." }
      ]
    },
    { title: "Правила измерения", id: "izmerenie", icon: Ruler, hasDoc: false, description: "Общие правила и методы проведения контрольных измерений при приемке строительно-монтажных работ." },
    { 
      title: "СН 1.04.01-2020 Техническое состояние зданий и сооружений", 
      id: "sn_teh_sostoyanie", 
      icon: FileText, 
      hasDoc: true, 
      hideFromHome: true, 
      description: "Оценка технического состояния эксплуатируемых зданий и сооружений." 
    },
  ];

  const filteredSections = controlSections
    .filter(s => !s.hideFromHome)
    .map(section => {
      const q = searchQuery.toLowerCase();
      const matchesSection = section.title.toLowerCase().includes(q);
      const matchingSubSections = section.subSections?.filter(sub => 
        sub.title.toLowerCase().includes(q)
      );
      
      if (matchesSection || (matchingSubSections && matchingSubSections.length > 0)) {
        return {
          ...section,
          subSections: matchesSection ? section.subSections : matchingSubSections
        };
      }
      return null;
    }).filter(Boolean) as typeof controlSections;

  const allDocuments = controlSections.flatMap(section => {
    const docs = [];
    if (section.hasDoc) {
      docs.push({ id: section.id, title: section.docTitle || section.title, description: section.description || "", parentTitle: section.hideFromHome ? undefined : section.title, isSub: false, icon: section.icon, hasDoc: true });
    }
    if (section.subSections) {
      section.subSections.forEach(sub => {
        if (sub.hasDoc) {
          docs.push({ id: sub.id, title: (sub as any).docTitle || sub.title, description: sub.description || "", parentTitle: section.title as string | undefined, isSub: true, icon: section.icon, hasDoc: true });
        }
      });
    }
    return docs;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-8 selection:bg-blue-100 relative">
      {/* Header */}
      <header className={`absolute top-0 left-0 w-full z-50 px-6 py-4 flex justify-between items-center ${currentTab === 'home' ? 'bg-gradient-to-b from-black/60 to-transparent' : 'bg-blue-600 shadow-md'}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600/90 backdrop-blur-sm flex items-center justify-center shadow-sm border border-white/20">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white tracking-tight">
            А-100 <span className="text-white/70 font-medium">Справочник</span>
          </span>
        </div>
      </header>

      {currentTab === 'home' && (
        <>
          {/* Hero Section */}
          <section className="relative w-full h-[320px] shrink-0 overflow-hidden">
            <img
              src="https://lh3.googleusercontent.com/aida/ADBb0uh2vT1dgxF880sQozdcebw43pAO3mmHTKUXYsfPWcok8ReIJrRsiniaj9kmQ0BXNj5zjkRPBV0eP3h-ZIKsOGZrDpgBLyhCi_9nE2cIRLXZltqXVip3SfponxzP84dtvxL2Fh-wUqhvkxTjN5NC7RtI4Xm-p_u0StzcO_pkDTq0BTwovJdcdThOVH_J05WtSju7fGSWSh4pN2ZSC9gJU9hQb5HPFQull8JkP_tluWawoCH2cJuxFATm3KFZxNn7-VfwuNQ5AssgTA"
              alt="Construction Site"
              className="w-full h-full object-cover brightness-[0.7]"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent flex flex-col justify-end p-6 pb-12">
              <h1 className="text-white font-bold text-3xl leading-tight tracking-tight">
                Контроль и<br />совершенство
              </h1>
              <p className="text-slate-300 text-sm mt-2 max-w-[80%]">
                Нормативы, СНиПы и регламенты качества А-100
              </p>
            </div>
          </section>

          {/* Search Section */}
          <div className="px-6 -mt-8 relative z-10">
            <div className="relative group shadow-lg rounded-2xl">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input
                type="text"
                className="block w-full pl-11 pr-4 py-4 bg-white border-none rounded-2xl text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="Поиск по документам и разделам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      <main className={`flex flex-col gap-6 px-6 pb-24 ${currentTab === 'home' ? 'pt-8' : 'pt-24'}`}>
        {currentTab === 'home' && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              {searchQuery ? "Результаты поиска" : "Разделы контроля"}
            </h2>
            <span className="text-xs text-slate-400 font-medium">{filteredSections.length} разделов</span>
          </div>

          <div className="flex flex-col gap-3">
            {filteredSections.map((section, index) => {
              const isExpanded = expandedTab === index || searchQuery.length > 0;
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={index}
                  className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${
                    isExpanded ? 'border-blue-200 shadow-md shadow-blue-900/5' : 'border-slate-200/60 shadow-sm hover:border-slate-300'
                  }`}
                >
                  <button
                    onClick={() => setExpandedTab(isExpanded ? null : index)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${
                        isExpanded ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <section.icon className="w-5 h-5" strokeWidth={2} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 text-sm leading-tight">
                          {section.title}
                        </span>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      >
                        <div className="px-4 pb-4 pt-1 grid grid-cols-1 gap-2">
                          {section.subSections ? (
                            <div className="flex flex-col gap-2">
                              {section.subSections.map((sub, idx) => (
                                <button 
                                  key={idx} 
                                  onClick={() => openSubSectionModal({...sub, id: sub.id || section.id, hasDoc: (sub as any).hasDoc})}
                                  className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl group transition-colors border border-transparent hover:border-slate-200 text-left"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></div>
                                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">{sub.title}</span>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                                </button>
                              ))}
                            </div>
                          ) : section.hasDoc ? (
                            <>
                              <button onClick={() => openDescriptionModal({ title: section.title, text: section.description || "" })} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-amber-50 rounded-xl group transition-colors border border-transparent hover:border-amber-100">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-amber-600">
                                    <AlignLeft className="w-4 h-4" />
                                  </div>
                                  <div className="flex flex-col items-start">
                                    <span className="text-sm font-medium text-slate-900 group-hover:text-amber-700 transition-colors">Краткое описание</span>
                                    <span className="text-[11px] text-slate-500">Основная информация</span>
                                  </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors" />
                              </button>

                              <button onClick={() => router.push(`/document/${section.id}/view`)} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-blue-50 rounded-xl group transition-colors border border-transparent hover:border-blue-100">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-blue-600">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div className="flex flex-col items-start">
                                    <span className="text-sm font-medium text-slate-900 group-hover:text-blue-700 transition-colors">Полный документ</span>
                                    <span className="text-[11px] text-slate-500">СП, ГОСТ, ТК</span>
                                  </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                              </button>

                              <button className="flex items-center justify-between p-3 bg-slate-50 hover:bg-emerald-50 rounded-xl group transition-colors border border-transparent hover:border-emerald-100">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-emerald-600">
                                    <Ruler className="w-4 h-4" />
                                  </div>
                                  <div className="flex flex-col items-start">
                                    <span className="text-sm font-medium text-slate-900 group-hover:text-emerald-700 transition-colors">Правила измерения</span>
                                    <span className="text-[11px] text-slate-500">Схемы и допуски</span>
                                  </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                              </button>

                              <button onClick={() => router.push(`/document/${section.id}/chat`)} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-purple-50 rounded-xl group transition-colors border border-transparent hover:border-purple-100">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-purple-600">
                                    <Sparkles className="w-4 h-4" />
                                  </div>
                                  <div className="flex flex-col items-start">
                                    <span className="text-sm font-medium text-slate-900 group-hover:text-purple-700 transition-colors">AI-Ассистент</span>
                                    <span className="text-[11px] text-slate-500">Задать вопрос нейросети</span>
                                  </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 transition-colors" />
                              </button>
                            </>
                          ) : (
                            <div className="p-4 text-center text-sm text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                              Документы для этого раздела еще не загружены
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
            {filteredSections.length === 0 && (
              <div className="text-center py-10">
                <p className="text-slate-500 text-sm">Ничего не найдено по запросу «{searchQuery}»</p>
              </div>
            )}
          </div>
        </section>
        )}

        {(currentTab === 'all-docs' || currentTab === 'favorites') && (
          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-4 mb-2">
              <h2 className="text-lg font-bold text-slate-800">
                {currentTab === 'all-docs' ? "Все документы" : "Избранное"}
              </h2>
              {currentTab === 'all-docs' && (
                <div className="relative group shadow-sm rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    placeholder="Поиск по всем документам..."
                    value={allDocsSearch}
                    onChange={(e) => setAllDocsSearch(e.target.value)}
                  />
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-3">
              {allDocuments
                .filter(doc => currentTab === 'favorites' ? favorites.includes(doc.id) : true)
                .filter(doc => currentTab === 'all-docs' && allDocsSearch.trim() !== '' 
                  ? doc.title.toLowerCase().includes(allDocsSearch.toLowerCase()) || (doc.parentTitle && doc.parentTitle.toLowerCase().includes(allDocsSearch.toLowerCase())) 
                  : true)
                .map((doc, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col transition-all hover:border-blue-200 hover:shadow-md">
                  <div className="p-4 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => {
                      if (doc.isSub) {
                        openSubSectionModal({ title: doc.title, description: doc.description, id: doc.id, hasDoc: doc.hasDoc });
                      } else {
                        // Click on main doc in "All docs" - let's send them to view directly
                        router.push(`/document/${doc.id}/view`);
                      }
                    }}>
                      <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 shrink-0">
                        <doc.icon className="w-5 h-5" strokeWidth={2} />
                      </div>
                      <div className="flex flex-col flex-1">
                        {doc.parentTitle && <span className="text-[11px] text-slate-400 font-medium mb-0.5">{doc.parentTitle}</span>}
                        <span className="font-semibold text-slate-900 text-sm leading-tight">
                          {doc.title}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => toggleFavorite(doc.id, e)}
                      className="p-2 -mr-2 text-slate-300 hover:text-amber-400 transition-colors"
                    >
                      <Star className={`w-6 h-6 ${favorites.includes(doc.id) ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                  </div>
                </div>
              ))}
              {currentTab === 'favorites' && favorites.length === 0 && (
                <div className="text-center py-10">
                  <Star className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">В избранном пока ничего нет</p>
                </div>
              )}
              {currentTab === 'all-docs' && allDocsSearch.trim() !== '' && allDocuments.filter(doc => 
                doc.title.toLowerCase().includes(allDocsSearch.toLowerCase()) || 
                (doc.parentTitle && doc.parentTitle.toLowerCase().includes(allDocsSearch.toLowerCase()))
              ).length === 0 && (
                <div className="text-center py-10">
                  <p className="text-slate-500 text-sm">По запросу «{allDocsSearch}» ничего не найдено</p>
                </div>
              )}
            </div>
          </section>
        )}

        {currentTab === 'profile' && (
          <section className="flex flex-col items-center justify-center py-6 px-4 max-w-sm mx-auto">
            {user ? (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60 w-full text-center flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shadow-inner">
                  <User className="w-10 h-10" />
                </div>
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-bold text-slate-800">Ваш Профиль</h2>
                  <p className="text-sm font-medium text-slate-500">{user.email}</p>
                </div>
                <div className="w-full h-px bg-slate-100 my-2"></div>
                <div className="w-full flex flex-col gap-2">
                  <button className="w-full p-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-medium transition-colors text-left flex justify-between items-center group">
                    Настройки аккаунта
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="w-full p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-semibold transition-colors mt-2"
                  >
                    Выйти из аккаунта
                  </button>
                </div>

                <div className="w-full flex flex-col gap-2 mt-4 pt-4 border-t border-slate-100 text-left">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Инструменты Администратора</h3>
                  <input
                    type="text"
                    value={parseTarget}
                    onChange={(e) => setParseTarget(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-200 rounded-xl px-3 py-2 text-xs transition-all"
                    placeholder="ID документа (напр. shtukaturka)"
                  />
                  <button 
                    onClick={async (e) => {
                      const btn = e.currentTarget;
                      btn.innerText = "Парсинг...";
                      btn.disabled = true;
                      try {
                        const res = await fetch("/api/admin/parse-pdf", {
                          method: "POST",
                          headers: {"Content-Type": "application/json"},
                          body: JSON.stringify({title: parseTarget})
                        });
                        const data = await res.json();
                        alert(data.success ? `Успешно! Извлечено ${data.textLength} символов.` : `Ошибка: ${data.error || 'Неизвестная ошибка'}`);
                      } catch (err) {
                        alert("Сетевая ошибка при парсинге");
                      } finally {
                        btn.innerText = "Распознать текст PDF";
                        btn.disabled = false;
                      }
                    }}
                    className="w-full p-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-sm font-semibold transition-colors text-center"
                  >
                    Распознать текст PDF
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/60 w-full">
                <div className="flex flex-col items-center mb-8">
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-md shadow-blue-500/20">
                    <Compass className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    {authMode === 'login' ? "С возвращением" : "Регистрация"}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {authMode === 'login' ? "Войдите в свой аккаунт" : "Создайте новый профиль"}
                  </p>
                </div>

                {authError && (
                  <div className="p-3 mb-4 text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl text-center">
                    {authError}
                  </div>
                )}

                <form onSubmit={handleAuth} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">Email</label>
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl px-4 py-3.5 text-sm transition-all"
                      placeholder="engineer@a100.by"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">Пароль</label>
                    <input 
                      type="password" 
                      required
                      minLength={8}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl px-4 py-3.5 text-sm transition-all"
                      placeholder="Минимум 8 символов"
                    />
                  </div>
                  
                  <button 
                    type="submit"
                    disabled={isAuthLoading || !email || password.length < 8}
                    className="w-full mt-2 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    {isAuthLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                    {authMode === 'login' ? "Войти" : "Зарегистрироваться"}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button 
                    onClick={() => {
                      setAuthMode(authMode === 'login' ? 'register' : 'login');
                      setAuthError("");
                    }}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {authMode === 'login' ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 px-6 py-3 pb-safe flex items-center justify-between z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setCurrentTab('home')}
          className={`flex flex-col items-center gap-1 min-w-[64px] ${currentTab === 'home' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-medium">Главная</span>
        </button>
        <button 
          onClick={() => setCurrentTab('all-docs')}
          className={`flex flex-col items-center gap-1 min-w-[64px] ${currentTab === 'all-docs' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Layers className="w-6 h-6" />
          <span className="text-[10px] font-medium">Все док.</span>
        </button>
        <button 
          onClick={() => setCurrentTab('favorites')}
          className={`flex flex-col items-center gap-1 min-w-[64px] ${currentTab === 'favorites' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Star className={`w-6 h-6 ${currentTab === 'favorites' ? 'fill-blue-600' : ''}`} />
          <span className="text-[10px] font-medium">Избранное</span>
        </button>
        <button 
          onClick={() => setCurrentTab('profile')}
          className={`flex flex-col items-center gap-1 min-w-[64px] ${currentTab === 'profile' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <User className="w-6 h-6" />
          <span className="text-[10px] font-medium">Профиль</span>
        </button>
      </div>

      {/* SubSection Modal */}
      <AnimatePresence>
        {selectedSubSection && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[110] bg-[#F8FAFC] flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 bg-white shadow-sm z-10">
              <button onClick={closeModals} className="p-2 -ml-2 text-slate-500 hover:text-slate-900">
                <ChevronRight className="w-6 h-6 rotate-180" />
              </button>
              <span className="font-semibold text-slate-900 text-sm truncate px-4">{selectedSubSection.title}</span>
              <div className="w-6" />
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-slate-900 ml-1">Материалы раздела</h3>
                
                <button onClick={() => openDescriptionModal({ title: selectedSubSection.title, text: selectedSubSection.description })} className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-amber-200 hover:shadow-md transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                      <AlignLeft className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-semibold text-slate-900">Краткое описание</span>
                      <span className="text-xs text-slate-500">Основная информация</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-amber-500 transition-colors" />
                </button>

                {selectedSubSection.hasDoc ? (
                  <>
                    <button onClick={() => router.push(`/document/${selectedSubSection.id}/view`)} className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-semibold text-slate-900">Полный документ</span>
                          <span className="text-xs text-slate-500">СП, ГОСТ, ТК</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </button>

                    <button className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                          <Ruler className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-semibold text-slate-900">Правила измерения</span>
                          <span className="text-xs text-slate-500">Схемы и допуски</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </button>

                    <button onClick={() => router.push(`/document/${selectedSubSection.id}/chat`)} className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-purple-200 hover:shadow-md transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-semibold text-slate-900">AI-Ассистент</span>
                          <span className="text-xs text-slate-500">Задать вопрос нейросети</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-purple-500 transition-colors" />
                    </button>
                  </>
                ) : (
                  <div className="p-4 mt-2 text-center text-sm text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Документы для этого подраздела еще не загружены
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Description Modal */}
      <AnimatePresence>
        {viewingDescription && descriptionContent && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[120] bg-white flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 bg-white">
              <button onClick={closeModals} className="p-2 -ml-2 text-slate-500 hover:text-slate-900">
                <X className="w-6 h-6" />
              </button>
              <span className="font-semibold text-slate-900 text-sm truncate max-w-[250px]">{descriptionContent.title}</span>
              <div className="w-6" />
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
              <div className="bg-white p-5 md:p-8 rounded-2xl shadow-sm border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-w-3xl mx-auto">
                <h2 className="text-lg font-bold text-slate-900 mb-4">{descriptionContent.title}</h2>
                {descriptionContent.text}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
