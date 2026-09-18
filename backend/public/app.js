/* ===================== API CLIENT ===================== */
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (S.token) headers['Authorization'] = 'Bearer ' + S.token;
  const res = await fetch(path, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.code = data.code; err.status = res.status;
    throw err;
  }
  return data;
}

/* ===================== STATE ===================== */
const uid = () => Math.random().toString(36).slice(2, 10);
let S = {
  token: localStorage.getItem('rf_token'),
  profile: null,
  resumes: [], covers: [], jobs: [],
  theme: localStorage.getItem('rf_theme') || 'light',
  lang: localStorage.getItem('rf_lang') || 'en',
  aiTool: 'writer', aiOutput: '', aiLoading: false,
  atsResult: null,
};
document.documentElement.setAttribute('data-theme', S.theme);
function isPremium(){ return !!S.profile && S.profile.plan === 'premium'; }

/* ===================== I18N ===================== */
const I18N = {
en:{
  dashboard:'Dashboard', my_resumes:'My resumes', cover_letters:'Cover letters', ats_score:'ATS score', ai_assistant:'AI assistant', job_tracker:'Job tracker', profile:'Profile', subscription:'Subscription',
  welcome:'Build a resume that gets you hired', sub:'Pick a template, fill in your details, and download a polished resume in minutes.', start:'Get started',
  new_resume:'New resume', save:'Save', download_pdf:'Download PDF', upgrade:'Upgrade to premium',
  toggle_dark_mode:'Toggle dark mode', log_out:'Log out', menu_label:'Menu',
  auth_login:'Log in', auth_create_account:'Create account', auth_full_name:'Full name', auth_email:'Email', auth_password:'Password', auth_password_ph:'At least 8 characters',
  welcome_back:'Welcome back, {name}', dash_subtitle:"Here's where things stand.",
  stat_resumes:'Resumes', stat_cover_letters:'Cover letters', stat_applications:'Applications tracked', stat_ats:'Last ATS score',
  quick_actions:'Quick actions',
  qa_start_title:'Start a resume', qa_start_desc:'Choose from 50+ templates and fill it in.', browse_templates:'Browse templates',
  qa_cover_title:'Write a cover letter', qa_cover_desc:'Draft one manually or generate it with AI.', open_cover_letters:'Open cover letters',
  qa_ats_title:'Check your ATS score', qa_ats_desc:"See how well your resume matches a job post.", run_ats_check:'Run ATS check',
  qa_jobs_title:'Track applications', qa_jobs_desc:'Keep every application in one board.', open_job_tracker:'Open job tracker',
  get_set_up:'Get set up', onb_create_resume:'Create your first resume', onb_add_experience:'Add your work experience', onb_download_pdf:'Download a PDF', onb_try_ai:'Try the AI assistant or ATS checker',
  premium_upsell_title:'Unlock AI writing, ATS scoring and unlimited downloads', premium_upsell_desc:'AI resume & cover letter writer, interview prep, grammar checks, unlimited watermark-free PDFs, and premium templates.',
  no_resumes_yet:'No resumes yet — create your first one.', saved_resumes_count:'{n} saved resumes.',
  updated_on:'Updated {date}', edit:'Edit', duplicate:'Duplicate', delete:'Delete', confirm_delete_resume:'Delete this resume?',
  choose_template:'Choose a template', tpl_combo_note:'{n}+ layout & color combinations — {m} of them Premium. Pick one — you can switch anytime in the editor.', template_locked:'This template is part of Premium — upgrade to unlock it',
  resume_not_found:'Resume not found.', back_to_resumes:'Back to resumes',
  change_template:'Change template', live_preview:'Live preview', premium_no_watermark:'Premium: no watermark, unlimited downloads', free_watermark_note:'Free plan: PDF includes a watermark',
  section_personal:'Personal information', section_summary:'Professional summary', section_experience:'Work experience', section_education:'Education', section_skills:'Skills',
  section_certifications:'Certifications', section_languages:'Languages', section_projects:'Projects', section_references:'References', section_hobbies:'Hobbies (optional)', section_colors:'Accent color', section_sharing:'Portfolio link',
  field_full_name:'Full name', field_job_title:'Job title', field_email:'Email', field_phone:'Phone', field_location:'Location', field_website:'Website / portfolio',
  upgrade_portfolio_ph:'Upgrade to add a portfolio link', summary_ph:'A short pitch about your experience and strengths...', draft_with_ai:'Draft this with AI',
  f_role:'Role', f_company:'Company', f_start:'Start', f_end:'End', f_highlights:'Highlights (one per line)',
  f_school:'School', f_degree:'Degree', f_field_of_study:'Field of study', f_gpa:'GPA (optional)',
  f_cert_name:'Certification', f_issuer:'Issuer', f_date:'Date',
  f_lang_name:'Language', f_proficiency:'Proficiency',
  f_project_name:'Project name', f_link:'Link', f_description:'Description',
  f_ref_name:'Name', f_relationship:'Relationship', f_contact_info:'Contact info',
  remove:'Remove', add_experience:'Add experience', add_education:'Add education', add_certification:'Add certification',
  add_language:'Add language', add_project:'Add project', add_reference:'Add reference', add_skill:'Add skill',
  skill_ph:'Skill', hobby_ph:'Type a hobby and press Enter',
  portfolio_pro_note:'Turn any resume into a live, shareable link — like a mini portfolio page.',
  publish_public_note:'Publish this resume as a public page anyone can view — handy as a portfolio link on LinkedIn or a CV.',
  make_public_label:'Make this resume public', shareable_link:'Shareable link', copy:'Copy',
  rs_summary:'Summary', rs_experience:'Experience', rs_education:'Education', rs_skills:'Skills', rs_certifications:'Certifications',
  rs_languages:'Languages', rs_projects:'Projects', rs_references:'References', rs_hobbies:'Hobbies', rs_your_name:'Your name', rs_your_job_title:'Your job title',
  new_cover_letter:'New cover letter', no_cover_letters_yet:'No cover letters yet.', saved_letters_count:'{n} saved letters.',
  letter_title:'Letter title', letter_title_ph:'Cover letter — Product Designer at Acme', based_on_resume:'Based on resume',
  company_role:'Company / role', company_role_ph:'Acme Inc — Product Designer', job_description_ai:'Job description (for AI draft)',
  jd_ph:'Paste the job posting here...', generate_with_ai:'Generate with AI', letter_body:'Letter body', save_cover_letter:'Save cover letter',
  ats_subtitle:"See how closely a resume matches a job description's language.", resume_label:'Resume', job_description:'Job description',
  jd_full_ph:'Paste the full job posting here...', check_score:'Check score',
  keyword_match_note:'Keyword match against the job description', matched_keywords:'Matched keywords', none_yet:'None yet',
  missing_keywords:'Missing keywords worth adding', great_coverage:'Great coverage!',
  run_check_prompt:'Run a check to see your score, matched keywords, and gaps.',
  ats_premium_title:'ATS score checker is a premium feature', ats_premium_desc:'Upgrade to see how well your resume matches any job description, with matched and missing keywords.',
  paste_jd_first:'Paste a job description first',
  ai_subtitle:'Powered by Gemini. Choose a tool and give it something to work with.',
  tool_writer_title:'Resume writer', tool_writer_desc:'Draft a professional summary or bullet points',
  tool_cover_title:'Cover letter', tool_cover_desc:'Generate a tailored cover letter',
  tool_interview_title:'Interview questions', tool_interview_desc:'Likely questions for a role',
  tool_grammar_title:'Grammar checker', tool_grammar_desc:'Fix grammar and tighten wording',
  tool_improve_title:'Improve my resume', tool_improve_desc:'Get targeted suggestions',
  resume_context:'Resume context', generate:'Generate', result:'Result', output_placeholder:'Output will appear here.', insert_into_summary:'Insert into summary',
  ai_premium_title:'AI tools are part of premium', ai_premium_desc:'AI resume writer, cover letter generator, interview prep and grammar checking — all powered by Gemini.',
  ai_input_label_writer:'Job title / focus for the summary', ai_input_label_interview:'Job title / description', ai_input_label_grammar:'Paste text to check', ai_input_label_improve:'Anything specific to focus on (optional)',
  ai_input_ph_writer:'e.g. Senior backend engineer, 8 years, fintech', ai_input_ph_cover:'Paste the job posting...', ai_input_ph_interview:'e.g. Data analyst at a healthcare startup',
  ai_input_ph_grammar:'Paste a paragraph from your resume...', ai_input_ph_improve:'e.g. Make it sound more results-driven',
  status:'Status', status_saved:'Saved', status_applied:'Applied', status_interview:'Interview', status_offer:'Offer', status_rejected:'Rejected',
  company:'Company', role:'Role', notes:'Notes', add_application:'Add application', applications_title:'Applications', no_applications_yet:'No applications yet.',
  company_role_required:'Company and role are required', applications_tracked_count:'{n} applications tracked.', remove_btn:'Remove',
  personal_website:'Personal website / portfolio',
  sub_intro:"Premium is a monthly subscription that renews automatically. Payments are processed securely by Flutterwave, and pricing is based on where you're connecting from.",
  free_plan:'Free', free_plan_desc:'Everything you need to build and download a resume.',
  free_f1:'Create a resume in minutes', free_f2:'50+ professional templates', free_f3:'Live preview', free_f4:'Download as PDF (watermarked)',
  free_f5:'Save resumes online', free_f6:'Dark mode', free_f7:'Multiple languages', free_f8:'Mobile-friendly design',
  premium_plan:'Premium', best_value:'Best value', premium_plan_desc:'Everything in Free, plus AI and unlimited exports. Billed monthly, cancel anytime.',
  prem_f1:'ATS score checker', prem_f2:'AI resume writer', prem_f3:'AI cover letter generator', prem_f4:'AI interview questions',
  prem_f5:'Resume grammar checker', prem_f6:'Resume improvement suggestions', prem_f7:'Unlimited PDF downloads', prem_f8:'No watermark',
  prem_f9:'Premium templates', prem_f10:'Personal website / portfolio link',
  current_plan:'Current plan', renews_on:'Renews automatically on {date}.', cancel_auto_renewal:'Cancel auto-renewal',
  your_price:'Your price:', detecting_region:'Detecting your region…',
  confirm_cancel_sub:"Cancel auto-renewal? You'll keep premium access until your current billing period ends.",
  rs_by_title:'{name} — Resume', made_with_resumly:'Made with Resumly', build_your_own_free:'Build your own free',
  link_not_available:'Link not available', link_not_available_desc:"This resume isn't public — the owner may have turned sharing off or downgraded their plan.", go_to_resumly:'Go to Resumly',
  toast_resume_saved:'Resume saved', toast_could_not_save:'Could not save: {msg}', toast_downloaded_premium:'Downloaded — no watermark',
  toast_downloaded_free:'Downloaded with watermark — upgrade to remove it', toast_pdf_error:'Could not generate PDF in this browser.',
  toast_link_copied:'Link copied', toast_copied:'Copied', toast_resume_public:'Resume is now public', toast_resume_private:'Resume is now private',
  toast_cover_saved:'Cover letter saved', toast_upgrade_ai:'Upgrade to premium to use AI generation', toast_ai_failed:'AI request failed: {msg}',
  toast_inserted_summary:'Inserted into resume summary', toast_profile_updated:'Profile updated', toast_payment_cancelled:'Payment cancelled',
  toast_payment_confirmed:'Payment confirmed — premium unlocked!', toast_payment_not_completed:'Payment was not completed.', toast_payment_verify_failed:'Could not verify payment: {msg}',
},
es:{
  dashboard:'Panel', my_resumes:'Mis currículos', cover_letters:'Cartas de presentación', ats_score:'Puntaje ATS', ai_assistant:'Asistente IA', job_tracker:'Seguimiento de empleos', profile:'Perfil', subscription:'Suscripción',
  welcome:'Crea un currículum que te contrate', sub:'Elige una plantilla, completa tus datos y descarga un currículum en minutos.', start:'Comenzar',
  new_resume:'Nuevo currículum', save:'Guardar', download_pdf:'Descargar PDF', upgrade:'Actualizar a premium',
  toggle_dark_mode:'Cambiar modo oscuro', log_out:'Cerrar sesión', menu_label:'Menú',
  auth_login:'Iniciar sesión', auth_create_account:'Crear cuenta', auth_full_name:'Nombre completo', auth_email:'Correo electrónico', auth_password:'Contraseña', auth_password_ph:'Al menos 8 caracteres',
  welcome_back:'Bienvenido de nuevo, {name}', dash_subtitle:'Así están las cosas.',
  stat_resumes:'Currículos', stat_cover_letters:'Cartas de presentación', stat_applications:'Solicitudes registradas', stat_ats:'Último puntaje ATS',
  quick_actions:'Acciones rápidas',
  qa_start_title:'Crea un currículum', qa_start_desc:'Elige entre más de 50 plantillas y complétalo.', browse_templates:'Explorar plantillas',
  qa_cover_title:'Escribe una carta de presentación', qa_cover_desc:'Redáctala tú mismo o generala con IA.', open_cover_letters:'Abrir cartas de presentación',
  qa_ats_title:'Revisa tu puntaje ATS', qa_ats_desc:'Descubre qué tan bien coincide tu currículum con una oferta de empleo.', run_ats_check:'Ejecutar verificación ATS',
  qa_jobs_title:'Registra tus solicitudes', qa_jobs_desc:'Mantén todas tus solicitudes en un solo tablero.', open_job_tracker:'Abrir seguimiento de empleos',
  get_set_up:'Comienza a configurar', onb_create_resume:'Crea tu primer currículum', onb_add_experience:'Agrega tu experiencia laboral', onb_download_pdf:'Descarga un PDF', onb_try_ai:'Prueba el asistente de IA o el verificador ATS',
  premium_upsell_title:'Desbloquea la redacción con IA, la puntuación ATS y descargas ilimitadas', premium_upsell_desc:'Redactor de currículums y cartas con IA, preparación para entrevistas, corrección gramatical, PDFs ilimitados sin marca de agua y plantillas premium.',
  no_resumes_yet:'Aún no tienes currículos — crea el primero.', saved_resumes_count:'{n} currículos guardados.',
  updated_on:'Actualizado el {date}', edit:'Editar', duplicate:'Duplicar', delete:'Eliminar', confirm_delete_resume:'¿Eliminar este currículum?',
  choose_template:'Elige una plantilla', tpl_combo_note:'{n}+ combinaciones de diseño y color — {m} de ellas son Premium. Elige una — puedes cambiarla en cualquier momento en el editor.', template_locked:'Esta plantilla es parte de Premium — actualiza para desbloquearla',
  resume_not_found:'Currículum no encontrado.', back_to_resumes:'Volver a los currículos',
  change_template:'Cambiar plantilla', live_preview:'Vista previa en vivo', premium_no_watermark:'Premium: sin marca de agua, descargas ilimitadas', free_watermark_note:'Plan gratuito: el PDF incluye una marca de agua',
  section_personal:'Información personal', section_summary:'Resumen profesional', section_experience:'Experiencia laboral', section_education:'Educación', section_skills:'Habilidades',
  section_certifications:'Certificaciones', section_languages:'Idiomas', section_projects:'Proyectos', section_references:'Referencias', section_hobbies:'Pasatiempos (opcional)', section_colors:'Color de acento', section_sharing:'Enlace de portafolio',
  field_full_name:'Nombre completo', field_job_title:'Puesto', field_email:'Correo electrónico', field_phone:'Teléfono', field_location:'Ubicación', field_website:'Sitio web / portafolio',
  upgrade_portfolio_ph:'Actualiza para agregar un enlace de portafolio', summary_ph:'Una breve presentación sobre tu experiencia y fortalezas...', draft_with_ai:'Redactar esto con IA',
  f_role:'Puesto', f_company:'Empresa', f_start:'Inicio', f_end:'Fin', f_highlights:'Logros (uno por línea)',
  f_school:'Escuela', f_degree:'Título', f_field_of_study:'Campo de estudio', f_gpa:'Promedio (opcional)',
  f_cert_name:'Certificación', f_issuer:'Emisor', f_date:'Fecha',
  f_lang_name:'Idioma', f_proficiency:'Nivel',
  f_project_name:'Nombre del proyecto', f_link:'Enlace', f_description:'Descripción',
  f_ref_name:'Nombre', f_relationship:'Relación', f_contact_info:'Información de contacto',
  remove:'Eliminar', add_experience:'Agregar experiencia', add_education:'Agregar educación', add_certification:'Agregar certificación',
  add_language:'Agregar idioma', add_project:'Agregar proyecto', add_reference:'Agregar referencia', add_skill:'Agregar habilidad',
  skill_ph:'Habilidad', hobby_ph:'Escribe un pasatiempo y presiona Enter',
  portfolio_pro_note:'Convierte cualquier currículum en un enlace en vivo y compartible, como una mini página de portafolio.',
  publish_public_note:'Publica este currículum como una página pública que cualquiera puede ver — útil como enlace de portafolio en LinkedIn o en un CV.',
  make_public_label:'Hacer público este currículum', shareable_link:'Enlace para compartir', copy:'Copiar',
  rs_summary:'Resumen', rs_experience:'Experiencia', rs_education:'Educación', rs_skills:'Habilidades', rs_certifications:'Certificaciones',
  rs_languages:'Idiomas', rs_projects:'Proyectos', rs_references:'Referencias', rs_hobbies:'Pasatiempos', rs_your_name:'Tu nombre', rs_your_job_title:'Tu puesto',
  new_cover_letter:'Nueva carta de presentación', no_cover_letters_yet:'Aún no tienes cartas de presentación.', saved_letters_count:'{n} cartas guardadas.',
  letter_title:'Título de la carta', letter_title_ph:'Carta de presentación — Diseñador de producto en Acme', based_on_resume:'Basado en currículum',
  company_role:'Empresa / puesto', company_role_ph:'Acme Inc — Diseñador de producto', job_description_ai:'Descripción del puesto (para borrador con IA)',
  jd_ph:'Pega la oferta de empleo aquí...', generate_with_ai:'Generar con IA', letter_body:'Cuerpo de la carta', save_cover_letter:'Guardar carta de presentación',
  ats_subtitle:'Descubre qué tan bien coincide un currículum con el lenguaje de una oferta de empleo.', resume_label:'Currículum', job_description:'Descripción del puesto',
  jd_full_ph:'Pega la oferta de empleo completa aquí...', check_score:'Verificar puntaje',
  keyword_match_note:'Coincidencia de palabras clave con la descripción del puesto', matched_keywords:'Palabras clave coincidentes', none_yet:'Ninguna todavía',
  missing_keywords:'Palabras clave que vale la pena agregar', great_coverage:'¡Excelente cobertura!',
  run_check_prompt:'Ejecuta una verificación para ver tu puntaje, palabras clave coincidentes y brechas.',
  ats_premium_title:'El verificador de puntaje ATS es una función premium', ats_premium_desc:'Actualiza para ver qué tan bien coincide tu currículum con cualquier descripción de puesto, con palabras clave coincidentes y faltantes.',
  paste_jd_first:'Primero pega una descripción del puesto',
  ai_subtitle:'Impulsado por Gemini. Elige una herramienta y dale algo con qué trabajar.',
  tool_writer_title:'Redactor de currículum', tool_writer_desc:'Redacta un resumen profesional o puntos clave',
  tool_cover_title:'Carta de presentación', tool_cover_desc:'Genera una carta de presentación personalizada',
  tool_interview_title:'Preguntas de entrevista', tool_interview_desc:'Preguntas probables para un puesto',
  tool_grammar_title:'Corrector gramatical', tool_grammar_desc:'Corrige la gramática y mejora la redacción',
  tool_improve_title:'Mejorar mi currículum', tool_improve_desc:'Obtén sugerencias específicas',
  resume_context:'Contexto del currículum', generate:'Generar', result:'Resultado', output_placeholder:'El resultado aparecerá aquí.', insert_into_summary:'Insertar en el resumen',
  ai_premium_title:'Las herramientas de IA son parte de premium', ai_premium_desc:'Redactor de currículum con IA, generador de cartas de presentación, preparación para entrevistas y corrección gramatical — todo impulsado por Gemini.',
  ai_input_label_writer:'Puesto / enfoque para el resumen', ai_input_label_interview:'Puesto / descripción', ai_input_label_grammar:'Pega el texto a revisar', ai_input_label_improve:'Algo específico en lo que enfocarse (opcional)',
  ai_input_ph_writer:'ej. Ingeniero backend senior, 8 años, fintech', ai_input_ph_cover:'Pega la oferta de empleo...', ai_input_ph_interview:'ej. Analista de datos en una startup de salud',
  ai_input_ph_grammar:'Pega un párrafo de tu currículum...', ai_input_ph_improve:'ej. Que suene más orientado a resultados',
  status:'Estado', status_saved:'Guardado', status_applied:'Postulado', status_interview:'Entrevista', status_offer:'Oferta', status_rejected:'Rechazado',
  company:'Empresa', role:'Puesto', notes:'Notas', add_application:'Agregar solicitud', applications_title:'Solicitudes', no_applications_yet:'Aún no hay solicitudes.',
  company_role_required:'La empresa y el puesto son obligatorios', applications_tracked_count:'{n} solicitudes registradas.', remove_btn:'Eliminar',
  personal_website:'Sitio web personal / portafolio',
  sub_intro:'Premium es una suscripción mensual que se renueva automáticamente. Los pagos se procesan de forma segura con Flutterwave, y el precio depende de tu ubicación.',
  free_plan:'Gratis', free_plan_desc:'Todo lo que necesitas para crear y descargar un currículum.',
  free_f1:'Crea un currículum en minutos', free_f2:'Más de 50 plantillas profesionales', free_f3:'Vista previa en vivo', free_f4:'Descarga en PDF (con marca de agua)',
  free_f5:'Guarda currículums en línea', free_f6:'Modo oscuro', free_f7:'Varios idiomas', free_f8:'Diseño adaptable a móviles',
  premium_plan:'Premium', best_value:'Mejor valor', premium_plan_desc:'Todo lo del plan gratuito, más IA y exportaciones ilimitadas. Facturación mensual, cancela cuando quieras.',
  prem_f1:'Verificador de puntaje ATS', prem_f2:'Redactor de currículum con IA', prem_f3:'Generador de cartas de presentación con IA', prem_f4:'Preguntas de entrevista con IA',
  prem_f5:'Corrector gramatical de currículum', prem_f6:'Sugerencias de mejora del currículum', prem_f7:'Descargas de PDF ilimitadas', prem_f8:'Sin marca de agua',
  prem_f9:'Plantillas premium', prem_f10:'Enlace de sitio web personal / portafolio',
  current_plan:'Plan actual', renews_on:'Se renueva automáticamente el {date}.', cancel_auto_renewal:'Cancelar renovación automática',
  your_price:'Tu precio:', detecting_region:'Detectando tu región…',
  confirm_cancel_sub:'¿Cancelar la renovación automática? Conservarás el acceso premium hasta que termine tu período de facturación actual.',
  rs_by_title:'{name} — Currículum', made_with_resumly:'Hecho con Resumly', build_your_own_free:'Crea el tuyo gratis',
  link_not_available:'Enlace no disponible', link_not_available_desc:'Este currículum no es público — es posible que el propietario haya desactivado el uso compartido o haya cambiado su plan.', go_to_resumly:'Ir a Resumly',
  toast_resume_saved:'Currículum guardado', toast_could_not_save:'No se pudo guardar: {msg}', toast_downloaded_premium:'Descargado — sin marca de agua',
  toast_downloaded_free:'Descargado con marca de agua — actualiza para quitarla', toast_pdf_error:'No se pudo generar el PDF en este navegador.',
  toast_link_copied:'Enlace copiado', toast_copied:'Copiado', toast_resume_public:'El currículum ahora es público', toast_resume_private:'El currículum ahora es privado',
  toast_cover_saved:'Carta de presentación guardada', toast_upgrade_ai:'Actualiza a premium para usar la generación con IA', toast_ai_failed:'La solicitud de IA falló: {msg}',
  toast_inserted_summary:'Insertado en el resumen del currículum', toast_profile_updated:'Perfil actualizado', toast_payment_cancelled:'Pago cancelado',
  toast_payment_confirmed:'¡Pago confirmado — premium desbloqueado!', toast_payment_not_completed:'El pago no se completó.', toast_payment_verify_failed:'No se pudo verificar el pago: {msg}',
},
fr:{
  dashboard:'Tableau de bord', my_resumes:'Mes CV', cover_letters:'Lettres de motivation', ats_score:'Score ATS', ai_assistant:'Assistant IA', job_tracker:'Suivi des candidatures', profile:'Profil', subscription:'Abonnement',
  welcome:'Créez un CV qui décroche des entretiens', sub:'Choisissez un modèle, remplissez vos informations et téléchargez un CV en quelques minutes.', start:'Commencer',
  new_resume:'Nouveau CV', save:'Enregistrer', download_pdf:'Télécharger le PDF', upgrade:'Passer à premium',
  toggle_dark_mode:'Basculer le mode sombre', log_out:'Se déconnecter', menu_label:'Menu',
  auth_login:'Se connecter', auth_create_account:'Créer un compte', auth_full_name:'Nom complet', auth_email:'E-mail', auth_password:'Mot de passe', auth_password_ph:'Au moins 8 caractères',
  welcome_back:'Content de vous revoir, {name}', dash_subtitle:'Voici où en sont les choses.',
  stat_resumes:'CV', stat_cover_letters:'Lettres de motivation', stat_applications:'Candidatures suivies', stat_ats:'Dernier score ATS',
  quick_actions:'Actions rapides',
  qa_start_title:'Créer un CV', qa_start_desc:'Choisissez parmi plus de 50 modèles et remplissez-le.', browse_templates:'Parcourir les modèles',
  qa_cover_title:'Rédiger une lettre de motivation', qa_cover_desc:"Rédigez-la vous-même ou générez-la avec l'IA.", open_cover_letters:'Ouvrir les lettres de motivation',
  qa_ats_title:'Vérifiez votre score ATS', qa_ats_desc:'Découvrez à quel point votre CV correspond à une offre d\u2019emploi.', run_ats_check:'Lancer la vérification ATS',
  qa_jobs_title:'Suivre les candidatures', qa_jobs_desc:'Gardez toutes vos candidatures sur un seul tableau.', open_job_tracker:'Ouvrir le suivi des candidatures',
  get_set_up:'Mettez-vous en route', onb_create_resume:'Créez votre premier CV', onb_add_experience:'Ajoutez votre expérience professionnelle', onb_download_pdf:'Téléchargez un PDF', onb_try_ai:"Essayez l'assistant IA ou le vérificateur ATS",
  premium_upsell_title:"Débloquez la rédaction IA, le score ATS et les téléchargements illimités", premium_upsell_desc:'Rédacteur de CV et lettres avec IA, préparation aux entretiens, vérification grammaticale, PDF illimités sans filigrane et modèles premium.',
  no_resumes_yet:'Aucun CV pour l\u2019instant — créez le premier.', saved_resumes_count:'{n} CV enregistrés.',
  updated_on:'Mis à jour le {date}', edit:'Modifier', duplicate:'Dupliquer', delete:'Supprimer', confirm_delete_resume:'Supprimer ce CV\u00a0?',
  choose_template:'Choisissez un modèle', tpl_combo_note:"{n}+ combinaisons de mise en page et de couleur — {m} d'entre elles sont Premium. Choisissez-en une — vous pourrez la changer à tout moment dans l'éditeur.", template_locked:"Ce modèle fait partie de Premium — passez à Premium pour le débloquer",
  resume_not_found:'CV introuvable.', back_to_resumes:'Retour aux CV',
  change_template:'Changer de modèle', live_preview:'Aperçu en direct', premium_no_watermark:'Premium\u00a0: sans filigrane, téléchargements illimités', free_watermark_note:'Plan gratuit\u00a0: le PDF inclut un filigrane',
  section_personal:'Informations personnelles', section_summary:'Résumé professionnel', section_experience:'Expérience professionnelle', section_education:'Formation', section_skills:'Compétences',
  section_certifications:'Certifications', section_languages:'Langues', section_projects:'Projets', section_references:'Références', section_hobbies:'Loisirs (facultatif)', section_colors:"Couleur d'accent", section_sharing:'Lien de portfolio',
  field_full_name:'Nom complet', field_job_title:'Intitulé du poste', field_email:'E-mail', field_phone:'Téléphone', field_location:'Lieu', field_website:'Site web / portfolio',
  upgrade_portfolio_ph:'Passez à Premium pour ajouter un lien de portfolio', summary_ph:'Une brève présentation de votre expérience et de vos points forts...', draft_with_ai:"Rédiger avec l'IA",
  f_role:'Poste', f_company:'Entreprise', f_start:'Début', f_end:'Fin', f_highlights:'Points forts (un par ligne)',
  f_school:'École', f_degree:'Diplôme', f_field_of_study:"Domaine d'étude", f_gpa:'Moyenne (facultatif)',
  f_cert_name:'Certification', f_issuer:'Organisme émetteur', f_date:'Date',
  f_lang_name:'Langue', f_proficiency:'Niveau',
  f_project_name:'Nom du projet', f_link:'Lien', f_description:'Description',
  f_ref_name:'Nom', f_relationship:'Relation', f_contact_info:'Coordonnées',
  remove:'Supprimer', add_experience:'Ajouter une expérience', add_education:'Ajouter une formation', add_certification:'Ajouter une certification',
  add_language:'Ajouter une langue', add_project:'Ajouter un projet', add_reference:'Ajouter une référence', add_skill:'Ajouter une compétence',
  skill_ph:'Compétence', hobby_ph:'Tapez un loisir et appuyez sur Entrée',
  portfolio_pro_note:"Transformez n'importe quel CV en un lien partageable en direct, comme une mini page de portfolio.",
  publish_public_note:"Publiez ce CV sous forme de page publique que tout le monde peut consulter — pratique comme lien de portfolio sur LinkedIn ou un CV.",
  make_public_label:'Rendre ce CV public', shareable_link:'Lien partageable', copy:'Copier',
  rs_summary:'Résumé', rs_experience:'Expérience', rs_education:'Formation', rs_skills:'Compétences', rs_certifications:'Certifications',
  rs_languages:'Langues', rs_projects:'Projets', rs_references:'Références', rs_hobbies:'Loisirs', rs_your_name:'Votre nom', rs_your_job_title:'Votre intitulé de poste',
  new_cover_letter:'Nouvelle lettre de motivation', no_cover_letters_yet:'Aucune lettre de motivation pour l\u2019instant.', saved_letters_count:'{n} lettres enregistrées.',
  letter_title:'Titre de la lettre', letter_title_ph:'Lettre de motivation — Designer produit chez Acme', based_on_resume:'Basé sur le CV',
  company_role:'Entreprise / poste', company_role_ph:'Acme Inc — Designer produit', job_description_ai:"Description du poste (pour le brouillon IA)",
  jd_ph:"Collez l'offre d'emploi ici...", generate_with_ai:"Générer avec l'IA", letter_body:'Corps de la lettre', save_cover_letter:'Enregistrer la lettre de motivation',
  ats_subtitle:"Découvrez à quel point un CV correspond au langage d'une offre d'emploi.", resume_label:'CV', job_description:'Description du poste',
  jd_full_ph:"Collez l'offre d'emploi complète ici...", check_score:'Vérifier le score',
  keyword_match_note:'Correspondance des mots-clés avec la description du poste', matched_keywords:'Mots-clés correspondants', none_yet:'Aucun pour l\u2019instant',
  missing_keywords:'Mots-clés manquants à ajouter', great_coverage:'Excellente couverture\u00a0!',
  run_check_prompt:'Lancez une vérification pour voir votre score, les mots-clés correspondants et les lacunes.',
  ats_premium_title:'Le vérificateur de score ATS est une fonctionnalité premium', ats_premium_desc:"Passez à Premium pour voir à quel point votre CV correspond à n'importe quelle description de poste, avec les mots-clés correspondants et manquants.",
  paste_jd_first:"Collez d'abord une description de poste",
  ai_subtitle:'Propulsé par Gemini. Choisissez un outil et donnez-lui de quoi travailler.',
  tool_writer_title:'Rédacteur de CV', tool_writer_desc:'Rédigez un résumé professionnel ou des points clés',
  tool_cover_title:'Lettre de motivation', tool_cover_desc:'Générez une lettre de motivation personnalisée',
  tool_interview_title:"Questions d'entretien", tool_interview_desc:'Questions probables pour un poste',
  tool_grammar_title:'Correcteur grammatical', tool_grammar_desc:'Corrigez la grammaire et affinez la formulation',
  tool_improve_title:'Améliorer mon CV', tool_improve_desc:'Obtenez des suggestions ciblées',
  resume_context:'Contexte du CV', generate:'Générer', result:'Résultat', output_placeholder:'Le résultat apparaîtra ici.', insert_into_summary:'Insérer dans le résumé',
  ai_premium_title:'Les outils IA font partie de Premium', ai_premium_desc:'Rédacteur de CV IA, générateur de lettres de motivation, préparation aux entretiens et vérification grammaticale — le tout propulsé par Gemini.',
  ai_input_label_writer:"Intitulé du poste / axe du résumé", ai_input_label_interview:'Intitulé du poste / description', ai_input_label_grammar:'Collez le texte à vérifier', ai_input_label_improve:'Un point précis à cibler (facultatif)',
  ai_input_ph_writer:'ex. Ingénieur backend senior, 8 ans, fintech', ai_input_ph_cover:"Collez l'offre d'emploi...", ai_input_ph_interview:'ex. Analyste de données dans une startup de santé',
  ai_input_ph_grammar:'Collez un paragraphe de votre CV...', ai_input_ph_improve:'ex. Le rendre plus axé sur les résultats',
  status:'Statut', status_saved:'Enregistré', status_applied:'Candidature envoyée', status_interview:'Entretien', status_offer:'Offre', status_rejected:'Refusé',
  company:'Entreprise', role:'Poste', notes:'Notes', add_application:'Ajouter une candidature', applications_title:'Candidatures', no_applications_yet:'Aucune candidature pour l\u2019instant.',
  company_role_required:"L'entreprise et le poste sont requis", applications_tracked_count:'{n} candidatures suivies.', remove_btn:'Supprimer',
  personal_website:'Site web personnel / portfolio',
  sub_intro:"Premium est un abonnement mensuel qui se renouvelle automatiquement. Les paiements sont traités en toute sécurité par Flutterwave, et le prix dépend de votre localisation.",
  free_plan:'Gratuit', free_plan_desc:'Tout ce dont vous avez besoin pour créer et télécharger un CV.',
  free_f1:'Créez un CV en quelques minutes', free_f2:'Plus de 50 modèles professionnels', free_f3:'Aperçu en direct', free_f4:'Téléchargement en PDF (avec filigrane)',
  free_f5:'Enregistrez vos CV en ligne', free_f6:'Mode sombre', free_f7:'Plusieurs langues', free_f8:'Conception adaptée aux mobiles',
  premium_plan:'Premium', best_value:'Meilleure offre', premium_plan_desc:"Tout ce qui est dans Gratuit, plus l'IA et des exports illimités. Facturation mensuelle, annulez à tout moment.",
  prem_f1:'Vérificateur de score ATS', prem_f2:'Rédacteur de CV IA', prem_f3:'Générateur de lettres de motivation IA', prem_f4:"Questions d'entretien IA",
  prem_f5:'Correcteur grammatical de CV', prem_f6:"Suggestions d'amélioration du CV", prem_f7:'Téléchargements PDF illimités', prem_f8:'Sans filigrane',
  prem_f9:'Modèles premium', prem_f10:'Lien de site web personnel / portfolio',
  current_plan:'Offre actuelle', renews_on:'Se renouvelle automatiquement le {date}.', cancel_auto_renewal:'Annuler le renouvellement automatique',
  your_price:'Votre prix\u00a0:', detecting_region:'Détection de votre région…',
  confirm_cancel_sub:"Annuler le renouvellement automatique\u00a0? Vous conserverez l'accès premium jusqu'à la fin de votre période de facturation actuelle.",
  rs_by_title:'{name} — CV', made_with_resumly:'Fait avec Resumly', build_your_own_free:'Créez le vôtre gratuitement',
  link_not_available:'Lien non disponible', link_not_available_desc:"Ce CV n'est pas public — le propriétaire a peut-être désactivé le partage ou changé de forfait.", go_to_resumly:'Aller sur Resumly',
  toast_resume_saved:'CV enregistré', toast_could_not_save:"Impossible d'enregistrer\u00a0: {msg}", toast_downloaded_premium:'Téléchargé — sans filigrane',
  toast_downloaded_free:'Téléchargé avec filigrane — passez à Premium pour le retirer', toast_pdf_error:'Impossible de générer le PDF dans ce navigateur.',
  toast_link_copied:'Lien copié', toast_copied:'Copié', toast_resume_public:'Le CV est maintenant public', toast_resume_private:'Le CV est maintenant privé',
  toast_cover_saved:'Lettre de motivation enregistrée', toast_upgrade_ai:'Passez à Premium pour utiliser la génération par IA', toast_ai_failed:"La requête IA a échoué\u00a0: {msg}",
  toast_inserted_summary:'Inséré dans le résumé du CV', toast_profile_updated:'Profil mis à jour', toast_payment_cancelled:'Paiement annulé',
  toast_payment_confirmed:'Paiement confirmé — Premium débloqué\u00a0!', toast_payment_not_completed:"Le paiement n'a pas été finalisé.", toast_payment_verify_failed:'Impossible de vérifier le paiement\u00a0: {msg}',
},
};
function t(k, vars){
  let s = (I18N[S.lang] && I18N[S.lang][k]) || I18N.en[k] || k;
  if(vars) Object.keys(vars).forEach(v => { s = s.replace(new RegExp('\\{'+v+'\\}','g'), vars[v]); });
  return s;
}

/* ===================== TEMPLATE CATALOG ===================== */
const LAYOUTS = [
  {id:'classic', name:'Classic'}, {id:'modern', name:'Modern sidebar'}, {id:'minimal', name:'Minimal'},
  {id:'compact', name:'Compact'}, {id:'elegant', name:'Elegant', premium:true}, {id:'creative', name:'Creative', premium:true}
];
const COLORS = [
  {id:'blue',hex:'#2453B8'},{id:'teal',hex:'#0F6E56'},{id:'coral',hex:'#B8501F'},{id:'plum',hex:'#7A2F52'},
  {id:'forest',hex:'#3B6D11'},{id:'navy',hex:'#0C447C'},{id:'amber',hex:'#8C5B0B'},{id:'violet',hex:'#534AB7'},
  {id:'crimson',hex:'#8C2A2A'}
];
function templateCombos(){
  const out = [];
  LAYOUTS.forEach(l => COLORS.forEach(c => out.push({layout:l.id, layoutName:l.name, color:c.id, hex:c.hex, premium:!!l.premium})));
  return out; // 54 combos, 18 of them premium-only (Elegant, Creative)
}
function blankData(){
  return { personal:{fullName:'', jobTitle:'', email:'', phone:'', location:'', website:'', summary:''},
    experience:[], education:[], skills:[], certifications:[], languages:[], projects:[], references:[], hobbies:[] };
}

/* ===================== LOGO ===================== */
function logoIcon(size){
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M12 4H30L40 14V40C40 42.2091 38.2091 44 36 44H12C9.79086 44 8 42.2091 8 40V8C8 5.79086 9.79086 4 12 4Z" fill="var(--accent)"/>
    <path d="M30 4L40 14H32C30.8954 14 30 13.1046 30 12V4Z" fill="var(--accent-ink)"/>
    <rect x="15" y="30" width="4" height="8" rx="1" fill="var(--gold)"/>
    <rect x="21" y="25" width="4" height="13" rx="1" fill="var(--gold)"/>
    <rect x="27" y="20" width="4" height="18" rx="1" fill="var(--gold)"/>
  </svg>`;
}
// Fixed-color version (not var(--accent), which would flip in dark mode) -
// used inside the resume page itself, which is always printed as black-on-
// white paper regardless of the app's own theme.
function logoIconFixed(size){
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M12 4H30L40 14V40C40 42.2091 38.2091 44 36 44H12C9.79086 44 8 42.2091 8 40V8C8 5.79086 9.79086 4 12 4Z" fill="#2453B8"/>
    <path d="M30 4L40 14H32C30.8954 14 30 13.1046 30 12V4Z" fill="#12306E"/>
    <rect x="15" y="30" width="4" height="8" rx="1" fill="#B8842E"/>
    <rect x="21" y="25" width="4" height="13" rx="1" fill="#B8842E"/>
    <rect x="27" y="20" width="4" height="18" rx="1" fill="#B8842E"/>
  </svg>`;
}

/* ===================== HELPERS ===================== */
function esc(s){ return (s||'').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function nl2ul(text){
  const lines = (text||'').split('\n').map(l=>l.trim()).filter(Boolean);
  if(!lines.length) return '';
  return '<ul>' + lines.map(l=>`<li>${esc(l)}</li>`).join('') + '</ul>';
}
function findResume(id){ return S.resumes.find(r=>r.id===id); }
function resumeCompleteness(r){
  const p = r.data.personal;
  const checks = [
    { done: !!(p.fullName && p.jobTitle && p.email), label:t('section_personal') },
    { done: !!p.summary, label:t('section_summary') },
    { done: r.data.experience.length>0, label:t('section_experience') },
    { done: r.data.education.length>0, label:t('section_education') },
    { done: r.data.skills.length>0, label:t('section_skills') },
  ];
  const done = checks.filter(c=>c.done).length;
  return { pct: Math.round((done/checks.length)*100), missing: checks.filter(c=>!c.done).map(c=>c.label) };
}
function flag(name){ return localStorage.getItem('rf_flag_'+name) === '1'; }
function setFlag(name){ localStorage.setItem('rf_flag_'+name, '1'); }
function toast(msg){
  const el = document.createElement('div'); el.className='toast'; el.textContent=msg;
  document.body.appendChild(el); setTimeout(()=>el.remove(), 2600);
}

/* ===================== BOOT / AUTH ===================== */
async function boot(){
  const shareMatch = location.pathname.match(/^\/r\/([\w-]+)$/);
  if(shareMatch){ renderPublicResume(shareMatch[1]); return; }
  if(!S.token){ renderLanding(); return; }
  try{
    const {user} = await api('/api/auth/me');
    S.profile = user;
    await Promise.all([loadResumes(), loadCovers(), loadJobs(), loadPricingTable()]);
    await handlePaymentCallback();
    if(!location.hash) location.hash = '#/dashboard';
    render();
  }catch(e){
    localStorage.removeItem('rf_token'); S.token=null; S.profile=null;
    renderLanding();
  }
}
async function handlePaymentCallback(){
  if(location.pathname !== '/payment/callback') return;
  const params = new URLSearchParams(location.search);
  const status = params.get('status');
  const transactionId = params.get('transaction_id');
  history.replaceState({}, '', '/' + (location.hash || '#/subscription'));
  if(status === 'cancelled'){ toast(t('toast_payment_cancelled')); return; }
  if(!transactionId) return;
  try{
    const {success, user} = await api(`/api/payments/verify/${encodeURIComponent(transactionId)}`);
    if(success){ S.profile = user; toast(t('toast_payment_confirmed')); }
    else toast(t('toast_payment_not_completed'));
  }catch(e){ toast(t('toast_payment_verify_failed', {msg:e.message})); }
}
async function loadResumes(){ const {resumes} = await api('/api/resumes'); S.resumes = resumes; }
async function loadCovers(){ const {covers} = await api('/api/covers'); S.covers = covers; }
async function loadJobs(){ const {jobs} = await api('/api/jobs'); S.jobs = jobs; }

function logout(){
  localStorage.removeItem('rf_token');
  S = {...S, token:null, profile:null, resumes:[], covers:[], jobs:[]};
  location.hash = '';
  renderLanding();
}

async function renderPublicResume(id){
  const app = document.getElementById('app');
  app.innerHTML = `<div class="center-spinner"><span class="spinner"></span></div>`;
  try{
    const {resume, ownerName} = await api(`/api/public/resumes/${id}`);
    app.innerHTML = `
      <div class="topbar" style="justify-content:center;">
        <div class="logo" style="cursor:default;">${logoIcon(26)}Resumly</div>
      </div>
      <main>
        <div class="page-head"><div><h1 style="font-size:20px;">${t('rs_by_title',{name:esc(ownerName)})}</h1><p class="muted">${t('made_with_resumly')}</p></div>
          <a class="btn btn-primary" href="/">${t('build_your_own_free')}</a></div>
        <div class="preview-stage"><div id="resume-preview-page">${renderResumePage(resume, {noWatermark:true})}</div></div>
      </main>`;
  }catch(e){
    app.innerHTML = `<div class="landing"><div class="landing-card card">
      <div style="display:flex;justify-content:center;margin-bottom:12px;">${logoIcon(44)}</div>
      <h1>${t('link_not_available')}</h1><p class="muted">${t('link_not_available_desc')}</p>
      <a class="btn btn-primary btn-block" href="/">${t('go_to_resumly')}</a>
    </div></div>`;
  }
}

window.addEventListener('hashchange', render);

/* ===================== RENDER: SHELL ===================== */
function currentRoute(){
  const h = location.hash.replace('#/','') || 'dashboard';
  const [route, param] = h.split('/');
  return {route, param};
}
function renderLanding(){
  document.getElementById('app').innerHTML = landingView();
  bindLanding();
}
function render(){
  const app = document.getElementById('app');
  if(!S.profile){ renderLanding(); return; }
  const {route, param} = currentRoute();
  let body = '';
  if(route==='dashboard') body = dashboardView();
  else if(route==='resumes') body = resumesView();
  else if(route==='editor') body = editorView(param);
  else if(route==='covers') body = coversView();
  else if(route==='ats') body = atsView();
  else if(route==='ai') body = aiView();
  else if(route==='jobs') body = jobsView();
  else if(route==='profile') body = profileView();
  else if(route==='subscription') body = subscriptionView();
  else body = dashboardView();

  app.innerHTML = topbar(route) + `<main>${body}</main>` + `<p class="footer-hint">Resumly — your data is stored on this server's database. AI features call Gemini live; upgrades go through Flutterwave. &nbsp;·&nbsp; <a href="/privacy" style="color:inherit;">Privacy Policy</a> &nbsp;·&nbsp; <a href="/terms" style="color:inherit;">Terms of Service</a></p>`;
  bindGlobal();
  if(route==='dashboard') bindDashboard();
  if(route==='resumes') bindResumes();
  if(route==='editor') bindEditor(param);
  if(route==='covers') bindCovers();
  if(route==='ats') bindAts();
  if(route==='ai') bindAi();
  if(route==='jobs') bindJobs();
  if(route==='profile') bindProfile();
  if(route==='subscription') bindSubscription();
}
function topbar(route){
  const initials = (S.profile.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const nav = [
    ['dashboard', t('dashboard'), '&#9635;'], ['resumes', t('my_resumes'), '&#128196;'],
    ['covers', t('cover_letters'), '&#9993;'], ['ats', t('ats_score'), '&#127919;'],
    ['ai', t('ai_assistant'), '&#10024;'], ['jobs', t('job_tracker'), '&#128188;'],
    ['profile', t('profile'), '&#128100;'], ['subscription', t('subscription'), '&#11088;']
  ];
  return `
  <div class="topbar">
    <button class="icon-btn hamburger" id="hamburger" aria-label="${t('menu_label')}">&#9776;</button>
    <div class="logo" data-nav="dashboard">${logoIcon(28)}Resumly</div>
    <nav class="topnav" id="topnav">
      ${nav.map(([r,label,ic]) => `<a href="#/${r}" class="${route===r?'active':''}">${label}${r==='ats'||r==='ai'?' <span class="badge badge-gold" style="margin-left:4px">Pro</span>':''}</a>`).join('')}
    </nav>
    <div class="topbar-right">
      <button class="icon-btn" id="theme-toggle" title="${t('toggle_dark_mode')}">${S.theme==='dark'?'&#9728;':'&#9789;'}</button>
      <select id="lang-select" class="btn btn-sm" style="padding:6px 8px;">
        <option value="en" ${S.lang==='en'?'selected':''}>EN</option>
        <option value="es" ${S.lang==='es'?'selected':''}>ES</option>
        <option value="fr" ${S.lang==='fr'?'selected':''}>FR</option>
      </select>
      <div class="avatar" title="${esc(S.profile.name)}">${initials}</div>
      <button class="icon-btn" id="logout-btn" title="${t('log_out')}">&#10148;</button>
    </div>
  </div>`;
}
function bindGlobal(){
  document.querySelectorAll('[data-nav]').forEach(el => el.addEventListener('click', ()=> location.hash = '#/'+el.dataset.nav));
  const hb = document.getElementById('hamburger');
  if(hb) hb.addEventListener('click', ()=> document.getElementById('topnav').classList.toggle('open'));
  document.querySelectorAll('.topnav a').forEach(a => a.addEventListener('click', ()=> document.getElementById('topnav').classList.remove('open')));
  const tt = document.getElementById('theme-toggle');
  if(tt) tt.addEventListener('click', ()=>{ S.theme = S.theme==='dark' ? 'light':'dark'; document.documentElement.setAttribute('data-theme', S.theme); localStorage.setItem('rf_theme', S.theme); render(); });
  const ls = document.getElementById('lang-select');
  if(ls) ls.addEventListener('change', e=>{ S.lang = e.target.value; localStorage.setItem('rf_lang', S.lang); render(); });
  const lo = document.getElementById('logout-btn');
  if(lo) lo.addEventListener('click', logout);
}

/* ===================== LANDING / LOGIN / REGISTER ===================== */
let authMode = 'login';
function landingView(){
  return `<div class="landing"><div class="landing-card card">
    <div style="display:flex;justify-content:center;margin-bottom:12px;">${logoIcon(44)}</div>
    <h1>${t('welcome')}</h1>
    <p class="muted">${t('sub')}</p>
    <div class="auth-tabs">
      <button class="pill-tab ${authMode==='login'?'active':''}" data-authmode="login">${t('auth_login')}</button>
      <button class="pill-tab ${authMode==='register'?'active':''}" data-authmode="register">${t('auth_create_account')}</button>
    </div>
    <div style="text-align:left;">
      ${authMode==='register' ? `<div class="field"><label>${t('auth_full_name')}</label><input id="au-name" type="text" placeholder="Jordan Avery"></div>` : ''}
      <div class="field"><label>${t('auth_email')}</label><input id="au-email" type="email" placeholder="jordan@email.com"></div>
      <div class="field"><label>${t('auth_password')}</label><input id="au-password" type="password" placeholder="${t('auth_password_ph')}"></div>
    </div>
    <button class="btn btn-primary btn-block" id="au-submit">${authMode==='login' ? t('auth_login') : t('start')} &rarr;</button>
    <p class="err-text hidden" id="au-error"></p>
    <p class="muted" style="font-size:11.5px;margin-top:16px;">By continuing you agree to our <a href="/terms" style="color:inherit;text-decoration:underline;">Terms of Service</a> and <a href="/privacy" style="color:inherit;text-decoration:underline;">Privacy Policy</a>.</p>
  </div></div>`;
}
function bindLanding(){
  document.querySelectorAll('[data-authmode]').forEach(b=>b.addEventListener('click', ()=>{ authMode=b.dataset.authmode; renderLanding(); }));
  document.getElementById('au-submit').addEventListener('click', async ()=>{
    const email = document.getElementById('au-email').value.trim();
    const password = document.getElementById('au-password').value;
    const errEl = document.getElementById('au-error');
    errEl.classList.add('hidden');
    const btn = document.getElementById('au-submit');
    const old = btn.innerHTML; btn.innerHTML = '<span class="spinner"></span>'; btn.disabled = true;
    try{
      let res;
      if(authMode==='register'){
        const name = document.getElementById('au-name').value.trim();
        res = await api('/api/auth/register', {method:'POST', body:{name, email, password}});
      } else {
        res = await api('/api/auth/login', {method:'POST', body:{email, password}});
      }
      S.token = res.token; localStorage.setItem('rf_token', S.token);
      S.profile = res.user;
      await Promise.all([loadResumes(), loadCovers(), loadJobs(), loadPricingTable()]);
      location.hash = '#/dashboard'; render();
    }catch(e){
      errEl.textContent = e.message; errEl.classList.remove('hidden');
    }
    btn.innerHTML = old; btn.disabled = false;
  });
}

/* ===================== DASHBOARD ===================== */
function dashboardView(){
  const avgAts = S.atsResult ? S.atsResult.score : null;
  return `
  <div class="page-head"><div><h1>${t('welcome_back',{name:esc(S.profile.name.split(' ')[0])})}</h1><p class="muted">${t('dash_subtitle')}</p></div>
    <button class="btn btn-primary" data-nav="resumes">+ ${t('new_resume')}</button></div>
  <div class="grid-cards">
    <div class="stat"><div class="num">${S.resumes.length}</div><div class="lbl">${t('stat_resumes')}</div></div>
    <div class="stat"><div class="num">${S.covers.length}</div><div class="lbl">${t('stat_cover_letters')}</div></div>
    <div class="stat"><div class="num">${S.jobs.length}</div><div class="lbl">${t('stat_applications')}</div></div>
    <div class="stat"><div class="num">${avgAts!==null ? avgAts+'%' : '—'}</div><div class="lbl">${t('stat_ats')}</div></div>
  </div>
  <div class="section-title">${t('quick_actions')}</div>
  <div class="grid-cards">
    <div class="card"><h3 style="font-size:15px;">${t('qa_start_title')}</h3><p class="muted" style="font-size:13px;">${t('qa_start_desc')}</p><a class="btn btn-sm" href="#/resumes">${t('browse_templates')}</a></div>
    <div class="card"><h3 style="font-size:15px;">${t('qa_cover_title')}</h3><p class="muted" style="font-size:13px;">${t('qa_cover_desc')}</p><a class="btn btn-sm" href="#/covers">${t('open_cover_letters')}</a></div>
    <div class="card"><h3 style="font-size:15px;">${t('qa_ats_title')}</h3><p class="muted" style="font-size:13px;">${t('qa_ats_desc')}</p><a class="btn btn-sm" href="#/ats">${t('run_ats_check')}</a></div>
    <div class="card"><h3 style="font-size:15px;">${t('qa_jobs_title')}</h3><p class="muted" style="font-size:13px;">${t('qa_jobs_desc')}</p><a class="btn btn-sm" href="#/jobs">${t('open_job_tracker')}</a></div>
  </div>
  ${onboardingChecklist()}
  ${!isPremium() ? `<div class="section-title">${t('premium_upsell_title')}</div>${planCompareMini()}` : ''}
  `;
}
function onboardingChecklist(){
  const items = [
    { done: S.resumes.length>0, label:t('onb_create_resume'), href:'#/resumes' },
    { done: S.resumes.some(r=>r.data.experience.length>0), label:t('onb_add_experience'), href: S.resumes[0] ? '#/editor/'+S.resumes[0].id : '#/resumes' },
    { done: flag('downloaded'), label:t('onb_download_pdf'), href: S.resumes[0] ? '#/editor/'+S.resumes[0].id : '#/resumes' },
    { done: isPremium() || flag('ai_tried'), label:t('onb_try_ai'), href:'#/subscription' },
  ];
  const remaining = items.filter(i=>!i.done);
  if(!remaining.length) return '';
  const doneCount = items.length - remaining.length;
  return `<div class="section-title">${t('get_set_up')} (${doneCount}/${items.length})</div>
  <div class="card">
    ${items.map(i=>`<a href="${i.href}" style="display:flex;align-items:center;gap:10px;padding:8px 0;text-decoration:none;color:inherit;border-bottom:1px solid var(--border);">
      <span style="width:18px;height:18px;border-radius:50%;border:1.5px solid ${i.done?'var(--success)':'var(--border)'};background:${i.done?'var(--success)':'transparent'};color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;">${i.done?'&#10003;':''}</span>
      <span style="font-size:13.5px;${i.done?'color:var(--text-2);text-decoration:line-through;':''}">${i.label}</span>
    </a>`).join('')}
  </div>`;
}
function planCompareMini(){
  return `<div class="upgrade-card">
    <h3 style="font-size:17px;">${t('premium_upsell_title')}</h3>
    <p class="muted">${t('premium_upsell_desc')}</p>
    <button class="btn btn-gold" data-nav="subscription">${t('upgrade')}</button>
  </div>`;
}
function bindDashboard(){}

/* ===================== RESUMES LIST ===================== */
function resumesView(){
  return `
  <div class="page-head"><div><h1>${t('my_resumes')}</h1><p class="muted">${t('saved_resumes_count',{n:S.resumes.length})}</p></div>
    <button class="btn btn-primary" id="new-resume-btn">+ ${t('new_resume')}</button></div>
  <div class="grid-cards">
    ${S.resumes.map(r => resumeCard(r)).join('') || `<p class="muted">${t('no_resumes_yet')}</p>`}
  </div>`;
}
function resumeCard(r){
  return `<div class="resume-card">
    <div class="resume-thumb" style="background:${r.color}22;">
      <div class="mini" style="border-top:14px solid ${r.color};padding-top:16px;">
        <div style="font-weight:700;font-size:7px;">${esc(r.data.personal.fullName||t('rs_your_name'))}</div>
        <div style="color:${r.color};font-size:5.5px;margin:2px 0 5px;">${esc(r.data.personal.jobTitle||t('rs_your_job_title'))}</div>
        <div style="height:2px;background:#eee;width:70%;margin-bottom:3px;"></div>
        <div style="height:2px;background:#eee;width:90%;margin-bottom:3px;"></div>
        <div style="height:2px;background:#eee;width:55%;"></div>
      </div>
    </div>
    <div class="resume-card-body">
      <div><strong>${esc(r.name)}</strong><div class="muted" style="font-size:11.5px;">${t('updated_on',{date:new Date(r.updatedAt).toLocaleDateString()})}</div></div>
      <div class="resume-card-actions">
        <a class="btn btn-sm" href="#/editor/${r.id}">${t('edit')}</a>
        <button class="btn btn-sm" data-dup="${r.id}">${t('duplicate')}</button>
        <button class="btn btn-sm btn-danger" data-del="${r.id}">${t('delete')}</button>
      </div>
    </div>
  </div>`;
}
function templatePickerModal(){
  const combos = templateCombos();
  return `<div class="overlay" id="tpl-overlay"><div class="modal">
    <div class="modal-head"><h3 style="margin:0;">${t('choose_template')}</h3><button class="icon-btn" id="tpl-close">&times;</button></div>
    <p class="muted" style="margin-top:-6px;">${t('tpl_combo_note',{n:combos.length, m:combos.filter(c=>c.premium).length})}</p>
    <div class="tpl-grid">
      ${combos.map(c => {
        const locked = c.premium && !isPremium();
        return `<button class="tpl-swatch ${locked?'locked':''}" data-layout="${c.layout}" data-hex="${c.hex}" data-premium="${c.premium}">
          <div class="head" style="background:${c.hex};"></div>
          <div class="lines"><div style="width:70%"></div><div style="width:90%"></div><div style="width:50%"></div></div>
          <div class="lbl">${c.layoutName} ${c.premium?'<span class="badge badge-gold" style="margin-left:4px;">Pro</span>':''}</div>
          ${locked?'<div class="lock-badge">&#128274;</div>':''}
        </button>`;
      }).join('')}
    </div>
  </div></div>`;
}
function bindResumes(){
  document.getElementById('new-resume-btn').addEventListener('click', openTemplatePicker);
  document.querySelectorAll('[data-dup]').forEach(b=>b.addEventListener('click', async ()=>{
    try{ const {resume} = await api(`/api/resumes/${b.dataset.dup}/duplicate`, {method:'POST'}); S.resumes.unshift(resume); render(); }
    catch(e){ toast(e.message); }
  }));
  document.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click', async ()=>{
    if(!confirm(t('confirm_delete_resume'))) return;
    try{ await api(`/api/resumes/${b.dataset.del}`, {method:'DELETE'}); S.resumes = S.resumes.filter(r=>r.id!==b.dataset.del); render(); }
    catch(e){ toast(e.message); }
  }));
}
function openTemplatePicker(forEdit){
  document.body.insertAdjacentHTML('beforeend', templatePickerModal());
  document.getElementById('tpl-close').addEventListener('click', ()=>document.getElementById('tpl-overlay').remove());
  document.getElementById('tpl-overlay').addEventListener('click', e=>{ if(e.target.id==='tpl-overlay') e.target.remove(); });
  document.querySelectorAll('.tpl-swatch').forEach(sw => sw.addEventListener('click', async ()=>{
    const layout = sw.dataset.layout, hex = sw.dataset.hex;
    if(sw.dataset.premium === 'true' && !isPremium()){
      toast(t('template_locked'));
      return;
    }
    document.getElementById('tpl-overlay').remove();
    if(forEdit){ forEdit(layout, hex); return; }
    try{
      const {resume} = await api('/api/resumes', {method:'POST', body:{name:t('new_resume'), template:layout, color:hex, data:blankData()}});
      S.resumes.unshift(resume);
      location.hash = '#/editor/'+resume.id; render();
    }catch(e){ toast(e.message); }
  }));
}

/* ===================== EDITOR ===================== */
let openAccordion = 'personal';
const saveTimers = {};
function setSaveStatus(text){ const el = document.getElementById('save-status'); if(el) el.textContent = text; }
function scheduleSave(r){
  setSaveStatus('Saving...');
  clearTimeout(saveTimers[r.id]);
  saveTimers[r.id] = setTimeout(()=> saveResumeNow(r), 800);
}
async function saveResumeNow(r){
  try{
    setSaveStatus('Saving...');
    const {resume} = await api(`/api/resumes/${r.id}`, {method:'PUT', body:{name:r.name, template:r.template, color:r.color, data:r.data}});
    r.updatedAt = resume.updatedAt;
    setSaveStatus('Saved just now');
  }catch(e){ setSaveStatus('Could not save'); toast(t('toast_could_not_save', {msg:e.message})); }
}

function editorView(id){
  const r = findResume(id);
  if(!r) return `<p>${t('resume_not_found')} <a href="#/resumes">${t('back_to_resumes')}</a></p>`;
  const comp = resumeCompleteness(r);
  return `
  <div class="page-head">
    <div><input id="ed-name" type="text" value="${esc(r.name)}" style="font-family:var(--font-display);font-size:22px;font-weight:600;border:none;background:transparent;padding:2px 0;max-width:400px;">
      <div style="display:flex;align-items:center;gap:8px;margin-top:4px;" id="ed-completeness">${completenessHtml(comp)}</div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn" id="ed-template-btn">${t('change_template')}</button>
      <button class="btn btn-primary" id="ed-save">${t('save')}</button>
      <button class="btn btn-gold" id="ed-download">${t('download_pdf')}</button>
    </div>
  </div>
  <div class="editor-wrap">
    <div class="editor-left">
      ${accordion('personal',t('section_personal'), personalForm(r))}
      ${accordion('summary',t('section_summary'), summaryForm(r))}
      ${accordion('experience',t('section_experience'), listForm(r,'experience'))}
      ${accordion('education',t('section_education'), listForm(r,'education'))}
      ${accordion('skills',t('section_skills'), skillsForm(r))}
      ${accordion('certifications',t('section_certifications'), listForm(r,'certifications'))}
      ${accordion('languages',t('section_languages'), listForm(r,'languages'))}
      ${accordion('projects',t('section_projects'), listForm(r,'projects'))}
      ${accordion('references',t('section_references'), listForm(r,'references'))}
      ${accordion('hobbies',t('section_hobbies'), hobbiesForm(r))}
      ${accordion('colors',t('section_colors'), colorForm(r))}
      ${accordion('sharing',t('section_sharing'), sharingForm(r))}
    </div>
    <div>
      <div class="preview-toolbar">
        <span class="badge badge-outline">${t('live_preview')}</span>
        <span class="muted" style="font-size:12.5px;">${isPremium() ? t('premium_no_watermark') : t('free_watermark_note')}</span>
      </div>
      <div class="preview-stage"><div id="resume-preview-page">${renderResumePage(r)}</div></div>
    </div>
  </div>`;
}
function completenessHtml(comp){
  return `<div style="width:70px;height:6px;border-radius:99px;background:var(--surface-2);overflow:hidden;"><div style="width:${comp.pct}%;height:100%;background:${comp.pct===100?'var(--success)':'var(--accent)'};"></div></div>
    <span class="muted" style="font-size:12px;">${comp.pct}%${comp.missing.length?' — ' + comp.missing[0].toLowerCase():''}</span>
    <span class="muted" id="save-status" style="font-size:12px;"></span>`;
}
function accordion(id,label,body){
  const open = openAccordion===id;
  return `<div class="acc ${open?'open':''}" data-acc="${id}">
    <div class="acc-head" data-acc-toggle="${id}">${label}<span class="chev">&#9660;</span></div>
    <div class="acc-body">${body}</div>
  </div>`;
}
function personalForm(r){
  const p = r.data.personal;
  return `
  <div class="field"><label>${t('field_full_name')}</label><input data-p="fullName" type="text" value="${esc(p.fullName)}"></div>
  <div class="field"><label>${t('field_job_title')}</label><input data-p="jobTitle" type="text" value="${esc(p.jobTitle)}"></div>
  <div class="row row-2"><div class="field"><label>${t('field_email')}</label><input data-p="email" type="email" value="${esc(p.email)}"></div>
  <div class="field"><label>${t('field_phone')}</label><input data-p="phone" type="text" value="${esc(p.phone)}"></div></div>
  <div class="row row-2"><div class="field"><label>${t('field_location')}</label><input data-p="location" type="text" value="${esc(p.location)}"></div>
  <div class="field"><label>${t('field_website')} ${!isPremium()?'<span class=\"badge badge-gold\">Pro</span>':''}</label><input data-p="website" type="text" value="${esc(p.website)}" ${!isPremium()?`disabled placeholder="${t('upgrade_portfolio_ph')}"`:''}></div></div>`;
}
function summaryForm(r){
  return `<div class="field"><textarea data-p="summary" rows="5" placeholder="${t('summary_ph')}">${esc(r.data.personal.summary)}</textarea></div>
  <button class="btn btn-sm" data-ai-jump="writer">&#10024; ${t('draft_with_ai')}</button>`;
}
function SECTION_FIELDS_FN(){
  return {
    experience:[['role',t('f_role')],['company',t('f_company')],['location',t('field_location')],['start',t('f_start')],['end',t('f_end')],['bullets',t('f_highlights')]],
    education:[['school',t('f_school')],['degree',t('f_degree')],['field',t('f_field_of_study')],['start',t('f_start')],['end',t('f_end')],['gpa',t('f_gpa')]],
    certifications:[['name',t('f_cert_name')],['issuer',t('f_issuer')],['date',t('f_date')]],
    languages:[['name',t('f_lang_name')],['level',t('f_proficiency')]],
    projects:[['name',t('f_project_name')],['link',t('f_link')],['description',t('f_description')]],
    references:[['name',t('f_ref_name')],['relation',t('f_relationship')],['contact',t('f_contact_info')]]
  };
}
const SECTION_FIELDS_RAW = {
  experience:['role','company','location','start','end','bullets'],
  education:['school','degree','field','start','end','gpa'],
  certifications:['name','issuer','date'],
  languages:['name','level'],
  projects:['name','link','description'],
  references:['name','relation','contact']
};
const ADD_LABEL_KEYS = { experience:'add_experience', education:'add_education', certifications:'add_certification', languages:'add_language', projects:'add_project', references:'add_reference' };
function listForm(r, section){
  const items = r.data[section];
  const fields = SECTION_FIELDS_FN()[section];
  return `${items.map((item,i)=>`
    <div class="entry" data-item="${item.id}">
      <div class="entry-top"><span class="entry-drag">#${i+1}</span><button class="btn btn-sm btn-danger" data-remove="${section}:${item.id}">${t('remove')}</button></div>
      ${fields.map(([k,label])=> k==='bullets'||k==='description' ?
        `<div class="field"><label>${label}</label><textarea data-item-field="${section}:${item.id}:${k}" rows="3">${esc(item[k])}</textarea></div>` :
        `<div class="field"><label>${label}</label><input data-item-field="${section}:${item.id}:${k}" type="text" value="${esc(item[k])}"></div>`
      ).join('')}
    </div>`).join('')}
    <button class="btn btn-sm btn-block" data-add="${section}">+ ${t(ADD_LABEL_KEYS[section])}</button>`;
}
function skillsForm(r){
  const items = r.data.skills;
  return `${items.map(s=>`
    <div class="skill-row" data-item="${s.id}">
      <input data-item-field="skills:${s.id}:name" type="text" value="${esc(s.name)}" style="max-width:120px;" placeholder="${t('skill_ph')}">
      <input type="range" min="0" max="100" value="${s.level}" data-item-field="skills:${s.id}:level">
      <span class="muted" style="width:34px;font-size:12px;">${s.level}%</span>
      <button class="btn btn-sm btn-danger" data-remove="skills:${s.id}">&times;</button>
    </div>`).join('')}
    <button class="btn btn-sm btn-block" data-add="skills">+ ${t('add_skill')}</button>`;
}
function hobbiesForm(r){
  const hobbies = r.data.hobbies;
  return `<div class="tagbar">${hobbies.map((h,i)=>`<span class="tag">${esc(h)}<button data-hobby-remove="${i}">&times;</button></span>`).join('')}</div>
    <div class="field" style="margin-top:10px;"><input id="hobby-input" type="text" placeholder="${t('hobby_ph')}"></div>`;
}
function colorForm(r){
  return `<div style="display:flex;gap:8px;flex-wrap:wrap;">
    ${COLORS.map(c=>`<button class="icon-btn" data-color="${c.hex}" style="background:${c.hex};border-color:${c.hex==r.color?'var(--text)':'transparent'};"></button>`).join('')}
  </div>`;
}
function sharingForm(r){
  if(!isPremium()){
    return `<p class="muted" style="font-size:12.5px;">${t('portfolio_pro_note')} <span class="badge badge-gold">Pro</span></p>
      <button class="btn btn-sm" data-nav="subscription">${t('upgrade')}</button>`;
  }
  const link = `${location.origin}/r/${r.id}`;
  return `<p class="muted" style="font-size:12.5px;">${t('publish_public_note')}</p>
    <label style="display:flex;align-items:center;gap:8px;text-transform:none;font-weight:500;font-size:13.5px;color:var(--text);cursor:pointer;">
      <input type="checkbox" id="share-toggle" ${r.isPublic?'checked':''} style="width:16px;height:16px;"> ${t('make_public_label')}
    </label>
    ${r.isPublic ? `<div class="field" style="margin-top:10px;"><label>${t('shareable_link')}</label>
      <div style="display:flex;gap:6px;"><input type="text" readonly value="${esc(link)}" id="share-link-input"><button class="btn btn-sm" id="share-copy">${t('copy')}</button></div></div>` : ''}`;
}
function renderResumePage(r, opts={}){
  const p = r.data.personal;
  const tplClass = 'tpl-' + r.template;
  const contact = [p.email,p.phone,p.location,p.website].filter(Boolean).map(esc).join(' &nbsp;&middot;&nbsp; ');
  const header = `<h1 class="name">${esc(p.fullName)||t('rs_your_name')}</h1><div class="title">${esc(p.jobTitle)||t('rs_your_job_title')}</div><div class="contact">${contact}</div>`;
  const summary = p.summary ? `<h2 class="sec">${t('rs_summary')}</h2><p>${esc(p.summary)}</p>` : '';
  const experience = r.data.experience.length ? `<h2 class="sec">${t('rs_experience')}</h2>${r.data.experience.map(e=>`
      <div class="item"><div class="item-top"><span>${esc(e.role)}${e.company?' — '+esc(e.company):''}</span><span>${esc(e.start)} – ${esc(e.end)}</span></div>
      <div class="item-sub">${esc(e.location)}</div>${nl2ul(e.bullets)}</div>`).join('')}` : '';
  const education = r.data.education.length ? `<h2 class="sec">${t('rs_education')}</h2>${r.data.education.map(e=>`
      <div class="item"><div class="item-top"><span>${esc(e.degree)}${e.field?', '+esc(e.field):''}</span><span>${esc(e.start)} – ${esc(e.end)}</span></div>
      <div class="item-sub">${esc(e.school)}${e.gpa?' &middot; GPA '+esc(e.gpa):''}</div></div>`).join('')}` : '';
  const skills = r.data.skills.length ? `<h2 class="sec">${t('rs_skills')}</h2><div class="skills-wrap">${r.data.skills.map(s=>`<span class="skillchip">${esc(s.name)}</span>`).join('')}</div>` : '';
  const certs = r.data.certifications.length ? `<h2 class="sec">${t('rs_certifications')}</h2>${r.data.certifications.map(c=>`
      <div class="item"><div class="item-top"><span>${esc(c.name)}</span><span>${esc(c.date)}</span></div><div class="item-sub">${esc(c.issuer)}</div></div>`).join('')}` : '';
  const langs = r.data.languages.length ? `<h2 class="sec">${t('rs_languages')}</h2>${r.data.languages.map(l=>`<div class="item item-top"><span>${esc(l.name)}</span><span>${esc(l.level)}</span></div>`).join('')}` : '';
  const projects = r.data.projects.length ? `<h2 class="sec">${t('rs_projects')}</h2>${r.data.projects.map(pr=>`
      <div class="item"><div class="item-top"><span>${esc(pr.name)}</span><span>${esc(pr.link)}</span></div><p style="margin:2px 0 0;">${esc(pr.description)}</p></div>`).join('')}` : '';
  const refs = r.data.references.length ? `<h2 class="sec">${t('rs_references')}</h2>${r.data.references.map(rf=>`
      <div class="item item-top"><span>${esc(rf.name)} — ${esc(rf.relation)}</span><span>${esc(rf.contact)}</span></div>`).join('')}` : '';
  const hobbies = r.data.hobbies.length ? `<h2 class="sec">${t('rs_hobbies')}</h2><div class="skills-wrap">${r.data.hobbies.map(h=>`<span class="skillchip">${esc(h)}</span>`).join('')}</div>` : '';
  const bodySections = summary+experience+education+skills+certs+langs+projects+refs+hobbies;
  const watermark = (!opts.noWatermark && !isPremium()) ? `<div class="watermark-diag">${Array.from({length:20}).map(()=>`<div class="wm-tile">${logoIconFixed(28)}<span>Resumly</span></div>`).join('')}</div>` : '';

  let inner;
  if(r.template==='modern'){
    inner = `<div class="side">${header}${skills}${langs}${hobbies}</div><div class="main">${summary}${experience}${education}${certs}${projects}${refs}</div>`;
  } else if(r.template==='creative'){
    inner = `<div class="rs-header">${header}</div>${bodySections}`;
  } else {
    inner = header + bodySections;
  }
  return `<div class="rs ${tplClass}" style="--tpl-accent:${r.color}">${inner}</div>${watermark}`;
}
function bindEditor(id){
  const r = findResume(id);
  if(!r) return;
  document.querySelectorAll('[data-acc-toggle]').forEach(h => h.addEventListener('click', ()=>{
    openAccordion = openAccordion === h.dataset.accToggle ? '' : h.dataset.accToggle;
    render();
  }));
  function touch(){ r.updatedAt = Date.now(); scheduleSave(r); refreshPreview(); refreshCompleteness(); }
  function refreshPreview(){ const pv = document.getElementById('resume-preview-page'); if(pv) pv.innerHTML = renderResumePage(r); }
  function refreshCompleteness(){ const c = document.getElementById('ed-completeness'); if(c) c.innerHTML = completenessHtml(resumeCompleteness(r)); }

  document.getElementById('ed-name').addEventListener('input', e=>{ r.name = e.target.value; touch(); });
  document.getElementById('ed-save').addEventListener('click', ()=>{ clearTimeout(saveTimers[r.id]); saveResumeNow(r).then(()=>toast(t('toast_resume_saved'))); });
  document.getElementById('ed-download').addEventListener('click', ()=> downloadResumePdf(r));
  document.getElementById('ed-template-btn').addEventListener('click', ()=>{
    openTemplatePicker((layout, hex)=>{ r.template = layout; r.color = hex; touch(); render(); });
  });

  document.querySelectorAll('[data-p]').forEach(inp => inp.addEventListener('input', e=>{
    r.data.personal[e.target.dataset.p] = e.target.value; touch();
  }));
  document.querySelectorAll('[data-color]').forEach(b => b.addEventListener('click', ()=>{ r.color = b.dataset.color; touch(); render(); }));

  document.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', ()=>{
    const section = b.dataset.add;
    const base = {id:uid()};
    (SECTION_FIELDS_RAW[section]||[]).forEach(k=> base[k]='');
    if(section==='skills'){ base.name=''; base.level=60; }
    r.data[section].push(base); touch(); render();
  }));
  document.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', ()=>{
    const [section,itemId] = b.dataset.remove.split(':');
    r.data[section] = r.data[section].filter(x=>x.id!==itemId); touch(); render();
  }));
  document.querySelectorAll('[data-item-field]').forEach(inp => {
    inp.addEventListener('input', e=>{
      const [section,itemId,field] = e.target.dataset.itemField.split(':');
      const item = r.data[section].find(x=>x.id===itemId);
      item[field] = e.target.type==='range' ? Number(e.target.value) : e.target.value;
      touch();
      if(e.target.type==='range'){ e.target.nextElementSibling.textContent = item[field]+'%'; }
    });
  });
  const hi = document.getElementById('hobby-input');
  if(hi) hi.addEventListener('keydown', e=>{
    if(e.key==='Enter' && e.target.value.trim()){ r.data.hobbies.push(e.target.value.trim()); touch(); render(); }
  });
  document.querySelectorAll('[data-hobby-remove]').forEach(b=>b.addEventListener('click', ()=>{
    r.data.hobbies.splice(Number(b.dataset.hobbyRemove),1); touch(); render();
  }));
  document.querySelectorAll('[data-ai-jump]').forEach(b=>b.addEventListener('click', ()=>{
    aiResumeContext = r.id; location.hash = '#/ai'; render();
  }));
  const shareToggle = document.getElementById('share-toggle');
  if(shareToggle) shareToggle.addEventListener('change', async e=>{
    try{
      const {resume} = await api(`/api/resumes/${r.id}/visibility`, {method:'PUT', body:{isPublic:e.target.checked}});
      r.isPublic = resume.isPublic;
      toast(r.isPublic ? t('toast_resume_public') : t('toast_resume_private'));
      render();
    }catch(err){ toast(err.message); e.target.checked = !e.target.checked; }
  });
  const shareCopy = document.getElementById('share-copy');
  if(shareCopy) shareCopy.addEventListener('click', ()=>{
    navigator.clipboard.writeText(document.getElementById('share-link-input').value);
    toast(t('toast_link_copied'));
  });
}

async function downloadResumePdf(r){
  const node = document.getElementById('resume-preview-page');
  const btn = document.getElementById('ed-download');
  const oldLabel = btn.textContent; btn.innerHTML = '<span class="spinner"></span> Preparing...'; btn.disabled = true;
  try{
    const canvas = await html2canvas(node, {scale:2, useCORS:true, backgroundColor:'#ffffff'});
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p','pt','a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgW = pageWidth;
    const imgH = canvas.height * (imgW/canvas.width);
    let heightLeft = imgH, position = 0;
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData,'PNG',0,position,imgW,imgH);
    heightLeft -= pageHeight;
    while(heightLeft > 0){
      position = heightLeft - imgH;
      pdf.addPage();
      pdf.addImage(imgData,'PNG',0,position,imgW,imgH);
      heightLeft -= pageHeight;
    }
    pdf.save((r.name||'resume').replace(/\s+/g,'_')+'.pdf');
    setFlag('downloaded');
    toast(isPremium() ? t('toast_downloaded_premium') : t('toast_downloaded_free'));
  }catch(err){
    toast(t('toast_pdf_error'));
  }
  btn.textContent = oldLabel; btn.disabled = false;
}

/* ===================== COVER LETTERS ===================== */
function coversView(){
  return `
  <div class="page-head"><div><h1>${t('cover_letters')}</h1><p class="muted">${t('saved_letters_count',{n:S.covers.length})}</p></div>
    <button class="btn btn-primary" id="new-cover-btn">+ ${t('new_cover_letter')}</button></div>
  <div class="grid-cards">
    ${S.covers.map(c=>`<div class="card">
      <strong>${esc(c.title)}</strong><p class="muted" style="font-size:12px;">${t('updated_on',{date:new Date(c.updatedAt).toLocaleDateString()})}</p>
      <p style="font-size:12.5px;max-height:60px;overflow:hidden;">${esc(c.body).slice(0,160)}...</p>
      <div style="display:flex;gap:6px;"><button class="btn btn-sm" data-edit-cover="${c.id}">${t('edit')}</button><button class="btn btn-sm btn-danger" data-del-cover="${c.id}">${t('delete')}</button></div>
    </div>`).join('') || `<p class="muted">${t('no_cover_letters_yet')}</p>`}
  </div>
  <div id="cover-editor"></div>`;
}
function coverEditorHtml(cover){
  const resumeOptions = S.resumes.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('');
  return `<div class="card" style="margin-top:20px;">
    <div class="field"><label>${t('letter_title')}</label><input id="cv-title" type="text" value="${esc(cover.title||'')}" placeholder="${t('letter_title_ph')}"></div>
    <div class="row row-2">
      <div class="field"><label>${t('based_on_resume')}</label><select id="cv-resume">${resumeOptions}</select></div>
      <div class="field"><label>${t('company_role')}</label><input id="cv-role" type="text" placeholder="${t('company_role_ph')}"></div>
    </div>
    <div class="field"><label>${t('job_description_ai')}</label><textarea id="cv-jd" rows="3" placeholder="${t('jd_ph')}"></textarea></div>
    <button class="btn btn-gold btn-sm" id="cv-generate">&#10024; ${t('generate_with_ai')} ${!isPremium()?'<span class="badge badge-outline" style="margin-left:4px;">Pro</span>':''}</button>
    <div class="field" style="margin-top:12px;"><label>${t('letter_body')}</label><textarea id="cv-body" rows="10">${esc(cover.body||'')}</textarea></div>
    <button class="btn btn-primary" id="cv-save">${t('save_cover_letter')}</button>
  </div>`;
}
let editingCover = null;
function bindCovers(){
  document.getElementById('new-cover-btn').addEventListener('click', ()=>{
    editingCover = {id:null, title:'', body:''};
    document.getElementById('cover-editor').innerHTML = coverEditorHtml(editingCover);
    bindCoverEditor();
  });
  document.querySelectorAll('[data-edit-cover]').forEach(b=>b.addEventListener('click', ()=>{
    editingCover = S.covers.find(c=>c.id===b.dataset.editCover);
    document.getElementById('cover-editor').innerHTML = coverEditorHtml(editingCover);
    bindCoverEditor();
  }));
  document.querySelectorAll('[data-del-cover]').forEach(b=>b.addEventListener('click', async ()=>{
    try{ await api(`/api/covers/${b.dataset.delCover}`, {method:'DELETE'}); S.covers = S.covers.filter(c=>c.id!==b.dataset.delCover); render(); }
    catch(e){ toast(e.message); }
  }));
}
function bindCoverEditor(){
  document.getElementById('cv-save').addEventListener('click', async ()=>{
    const title = document.getElementById('cv-title').value || 'Untitled letter';
    const body = document.getElementById('cv-body').value;
    try{
      if(editingCover.id){
        const {cover} = await api(`/api/covers/${editingCover.id}`, {method:'PUT', body:{title, body}});
        const idx = S.covers.findIndex(c=>c.id===cover.id); S.covers[idx] = cover;
      } else {
        const {cover} = await api('/api/covers', {method:'POST', body:{title, body}});
        S.covers.unshift(cover);
      }
      toast(t('toast_cover_saved')); render();
    }catch(e){ toast(e.message); }
  });
  document.getElementById('cv-generate').addEventListener('click', async ()=>{
    if(!isPremium()){ toast(t('toast_upgrade_ai')); return; }
    const resumeId = document.getElementById('cv-resume').value;
    const role = document.getElementById('cv-role').value;
    const jd = document.getElementById('cv-jd').value;
    const btn = document.getElementById('cv-generate');
    const old = btn.innerHTML; btn.innerHTML = '<span class="spinner"></span> Writing...'; btn.disabled = true;
    try{
      const input = `Role: ${role || 'the role'}\n\nJob description:\n${jd || 'not provided'}`;
      const {text} = await api('/api/ai/generate', {method:'POST', body:{tool:'cover', input, resumeId}});
      document.getElementById('cv-body').value = text;
    }catch(e){ toast(t('toast_ai_failed', {msg:e.message})); }
    btn.innerHTML = old; btn.disabled = false;
  });
}

/* ===================== ATS SCORE ===================== */
function atsView(){
  if(!isPremium()) return atsUpgradeGate();
  const resumeOptions = S.resumes.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('');
  const result = S.atsResult;
  return `
  <div class="page-head"><div><h1>${t('ats_score')}</h1><p class="muted">${t('ats_subtitle')}</p></div></div>
  <div class="row row-2">
    <div class="card">
      <div class="field"><label>${t('resume_label')}</label><select id="ats-resume">${resumeOptions}</select></div>
      <div class="field"><label>${t('job_description')}</label><textarea id="ats-jd" rows="10" placeholder="${t('jd_full_ph')}"></textarea></div>
      <button class="btn btn-primary" id="ats-run">${t('check_score')}</button>
    </div>
    <div class="card">
      ${result ? `
        <div class="gauge" style="background:conic-gradient(${gaugeColor(result.score)} ${result.score*3.6}deg, var(--surface-2) 0deg);">
          <div style="width:112px;height:112px;border-radius:50%;background:var(--surface);display:flex;align-items:center;justify-content:center;">
            <div class="num">${result.score}%</div>
          </div>
        </div>
        <p style="text-align:center;" class="muted">${t('keyword_match_note')}</p>
        <div class="section-title" style="margin-top:14px;">${t('matched_keywords')}</div>
        <div class="tagbar">${result.matched.map(w=>`<span class="tag">${esc(w)}</span>`).join('') || `<span class="muted">${t('none_yet')}</span>`}</div>
        <div class="section-title">${t('missing_keywords')}</div>
        <div class="tagbar">${result.missing.map(w=>`<span class="tag">${esc(w)}</span>`).join('') || `<span class="muted">${t('great_coverage')}</span>`}</div>
      ` : `<p class="muted">${t('run_check_prompt')}</p>`}
    </div>
  </div>`;
}
function gaugeColor(score){ return score>=70?'#3B6D11':score>=40?'#8C5B0B':'#8C2A2A'; }
function atsUpgradeGate(){
  return `<div class="page-head"><h1>${t('ats_score')}</h1></div>
  <div class="upgrade-card"><h3>${t('ats_premium_title')}</h3>
  <p class="muted">${t('ats_premium_desc')}</p>
  <button class="btn btn-gold" data-nav="subscription">${t('upgrade')}</button></div>`;
}
function bindAts(){
  const runBtn = document.getElementById('ats-run');
  if(!runBtn) return;
  runBtn.addEventListener('click', async ()=>{
    const resumeId = document.getElementById('ats-resume').value;
    const jobDescription = document.getElementById('ats-jd').value;
    if(!resumeId || !jobDescription.trim()){ toast(t('paste_jd_first')); return; }
    const old = runBtn.innerHTML; runBtn.innerHTML = '<span class="spinner"></span> Checking...'; runBtn.disabled = true;
    try{
      S.atsResult = await api('/api/ai/ats-check', {method:'POST', body:{resumeId, jobDescription}});
      render();
    }catch(e){ toast(e.message); runBtn.innerHTML = old; runBtn.disabled = false; }
  });
}

/* ===================== AI ASSISTANT ===================== */
let aiResumeContext = null;
function AI_TOOLS_FN(){
  return [
    {id:'writer', ic:'&#9997;', title:t('tool_writer_title'), desc:t('tool_writer_desc')},
    {id:'cover', ic:'&#9993;', title:t('tool_cover_title'), desc:t('tool_cover_desc')},
    {id:'interview', ic:'&#128172;', title:t('tool_interview_title'), desc:t('tool_interview_desc')},
    {id:'grammar', ic:'&#9989;', title:t('tool_grammar_title'), desc:t('tool_grammar_desc')},
    {id:'improve', ic:'&#128200;', title:t('tool_improve_title'), desc:t('tool_improve_desc')}
  ];
}
function aiView(){
  if(!isPremium()) return aiUpgradeGate();
  const resumeOptions = S.resumes.map(r=>`<option value="${r.id}" ${r.id===aiResumeContext?'selected':''}>${esc(r.name)}</option>`).join('');
  return `
  <div class="page-head"><div><h1>${t('ai_assistant')}</h1><p class="muted">${t('ai_subtitle')}</p></div></div>
  <div class="ai-tools">
    ${AI_TOOLS_FN().map(tool=>`<button class="ai-tool-btn ${S.aiTool===tool.id?'active':''}" data-ai-tool="${tool.id}">
        <span class="ic">${tool.ic}</span><span class="t">${tool.title}</span><div class="d">${tool.desc}</div></button>`).join('')}
  </div>
  <div class="card">
    <div class="field"><label>${t('resume_context')}</label><select id="ai-resume">${resumeOptions}</select></div>
    <div class="field"><label>${aiInputLabel()}</label><textarea id="ai-input" rows="4" placeholder="${aiInputPlaceholder()}"></textarea></div>
    <button class="btn btn-primary" id="ai-run">${t('generate')}</button>
    <div class="section-title">${t('result')}</div>
    <div class="ai-output">${S.aiOutput ? esc(S.aiOutput) : `<span class="muted">${t('output_placeholder')}</span>`}</div>
    ${S.aiOutput ? `<div style="margin-top:10px;display:flex;gap:8px;"><button class="btn btn-sm" id="ai-copy">${t('copy')}</button>${S.aiTool==='writer' ? `<button class="btn btn-sm" id="ai-insert">${t('insert_into_summary')}</button>` : ''}</div>` : ''}
  </div>`;
}
function aiInputLabel(){
  return {writer:t('ai_input_label_writer'), cover:t('job_description'), interview:t('ai_input_label_interview'), grammar:t('ai_input_label_grammar'), improve:t('ai_input_label_improve')}[S.aiTool];
}
function aiInputPlaceholder(){
  return {writer:t('ai_input_ph_writer'), cover:t('ai_input_ph_cover'), interview:t('ai_input_ph_interview'), grammar:t('ai_input_ph_grammar'), improve:t('ai_input_ph_improve')}[S.aiTool];
}
function aiUpgradeGate(){
  return `<div class="page-head"><h1>${t('ai_assistant')}</h1></div>
  <div class="upgrade-card"><h3>${t('ai_premium_title')}</h3>
  <p class="muted">${t('ai_premium_desc')}</p>
  <button class="btn btn-gold" data-nav="subscription">${t('upgrade')}</button></div>`;
}
function bindAi(){
  document.querySelectorAll('[data-ai-tool]').forEach(b=>b.addEventListener('click', ()=>{ S.aiTool=b.dataset.aiTool; S.aiOutput=''; render(); }));
  const runBtn = document.getElementById('ai-run');
  if(!runBtn) return;
  document.getElementById('ai-resume').addEventListener('change', e=> aiResumeContext = e.target.value);
  runBtn.addEventListener('click', async ()=>{
    const resumeId = document.getElementById('ai-resume').value;
    const input = document.getElementById('ai-input').value;
    const old = runBtn.innerHTML; runBtn.innerHTML = '<span class="spinner"></span> Working...'; runBtn.disabled = true;
    try{
      const {text} = await api('/api/ai/generate', {method:'POST', body:{tool:S.aiTool, input, resumeId}});
      S.aiOutput = text;
      setFlag('ai_tried');
    }catch(e){ toast(t('toast_ai_failed', {msg:e.message})); }
    runBtn.innerHTML = old; runBtn.disabled = false;
    render();
  });
  const copyBtn = document.getElementById('ai-copy');
  if(copyBtn) copyBtn.addEventListener('click', ()=>{ navigator.clipboard.writeText(S.aiOutput); toast(t('toast_copied')); });
  const insBtn = document.getElementById('ai-insert');
  if(insBtn) insBtn.addEventListener('click', async ()=>{
    const r = findResume(document.getElementById('ai-resume').value);
    if(r){ r.data.personal.summary = S.aiOutput; await saveResumeNow(r); toast(t('toast_inserted_summary')); }
  });
}

/* ===================== JOB TRACKER ===================== */
const JOB_STATUSES = ['Saved','Applied','Interview','Offer','Rejected'];
const JOB_STATUS_KEY = { Saved:'status_saved', Applied:'status_applied', Interview:'status_interview', Offer:'status_offer', Rejected:'status_rejected' };
function jobsView(){
  return `
  <div class="page-head"><div><h1>${t('job_tracker')}</h1><p class="muted">${t('applications_tracked_count',{n:S.jobs.length})}</p></div></div>
  <div class="card">
    <div class="row row-3">
      <div class="field"><label>${t('company')}</label><input id="job-company" type="text"></div>
      <div class="field"><label>${t('role')}</label><input id="job-role" type="text"></div>
      <div class="field"><label>${t('status')}</label><select id="job-status">
        ${JOB_STATUSES.map(s=>`<option value="${s}">${t(JOB_STATUS_KEY[s])}</option>`).join('')}</select></div>
    </div>
    <div class="row row-2">
      <div class="field"><label>${t('f_date')}</label><input id="job-date" type="date"></div>
      <div class="field"><label>${t('notes')}</label><input id="job-notes" type="text"></div>
    </div>
    <button class="btn btn-primary" id="job-add">${t('add_application')}</button>
  </div>
  <div class="section-title">${t('applications_title')}</div>
  <div class="card">
    <table class="simple"><thead><tr><th>${t('company')}</th><th>${t('role')}</th><th>${t('status')}</th><th>${t('f_date')}</th><th></th></tr></thead>
    <tbody>${S.jobs.map(j=>`<tr>
      <td>${esc(j.company)}</td><td>${esc(j.role)}</td>
      <td><span class="status-chip status-${j.status}">${t(JOB_STATUS_KEY[j.status]) || esc(j.status)}</span></td>
      <td>${j.date||'—'}</td>
      <td><button class="btn btn-sm btn-danger" data-del-job="${j.id}">${t('remove_btn')}</button></td>
    </tr>`).join('') || `<tr><td colspan="5" class="muted">${t('no_applications_yet')}</td></tr>`}</tbody></table>
  </div>`;
}
function bindJobs(){
  document.getElementById('job-add').addEventListener('click', async ()=>{
    const company = document.getElementById('job-company').value.trim();
    const role = document.getElementById('job-role').value.trim();
    if(!company || !role){ toast(t('company_role_required')); return; }
    try{
      const {job} = await api('/api/jobs', {method:'POST', body:{company, role, status:document.getElementById('job-status').value,
        date:document.getElementById('job-date').value, notes:document.getElementById('job-notes').value}});
      S.jobs.unshift(job); render();
    }catch(e){ toast(e.message); }
  });
  document.querySelectorAll('[data-del-job]').forEach(b=>b.addEventListener('click', async ()=>{
    try{ await api(`/api/jobs/${b.dataset.delJob}`, {method:'DELETE'}); S.jobs = S.jobs.filter(j=>j.id!==b.dataset.delJob); render(); }
    catch(e){ toast(e.message); }
  }));
}

/* ===================== PROFILE ===================== */
function profileView(){
  const p = S.profile;
  return `
  <div class="page-head"><h1>${t('profile')}</h1></div>
  <div class="card" style="max-width:560px;">
    <div class="field"><label>${t('field_full_name')}</label><input id="pf-name" type="text" value="${esc(p.name)}"></div>
    <div class="field"><label>${t('field_email')}</label><input type="email" value="${esc(p.email||'')}" disabled></div>
    <div class="row row-2">
      <div class="field"><label>${t('field_phone')}</label><input id="pf-phone" type="text" value="${esc(p.phone||'')}"></div>
      <div class="field"><label>${t('field_location')}</label><input id="pf-location" type="text" value="${esc(p.location||'')}"></div>
    </div>
    <div class="field"><label>${t('personal_website')} ${!isPremium()?'<span class="badge badge-gold">Pro</span>':''}</label>
      <input id="pf-website" type="text" value="${esc(p.website||'')}" ${!isPremium()?`disabled placeholder="${t('upgrade_portfolio_ph')}"`:''}></div>
    <button class="btn btn-primary" id="pf-save">${t('save')}</button>
  </div>`;
}
function bindProfile(){
  document.getElementById('pf-save').addEventListener('click', async ()=>{
    try{
      const {user} = await api('/api/auth/me', {method:'PUT', body:{
        name:document.getElementById('pf-name').value, phone:document.getElementById('pf-phone').value,
        location:document.getElementById('pf-location').value,
        website: isPremium() ? document.getElementById('pf-website').value : undefined
      }});
      S.profile = user; toast(t('toast_profile_updated')); render();
    }catch(e){ toast(e.message); }
  });
}

/* ===================== SUBSCRIPTION ===================== */
// Speed over precision for the *displayed* price: a timezone lookup is
// synchronous and instant (no network round trip), unlike asking ipinfo.io
// where the visitor actually is. The price shown here is a fast guess. The
// server never trusts it - /api/payments/initialize independently re-detects
// the real region from the request's IP at the moment of charging, so this
// shortcut can't be used to pay less than the correct price; it can only,
// rarely (e.g. a laptop clock set to another timezone, or a VPN), cause the
// number shown here to differ slightly from what Flutterwave actually charges.
function guessRegionFast(){
  try{
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if(tz === 'Africa/Lagos') return 'NG';
    if(tz.startsWith('Africa/')) return 'AFRICA';
  }catch(e){}
  return 'INTL';
}
let pricingTable = null; // {NG:{...}, AFRICA:{...}, INTL:{...}} - filled in by loadPricingTable()
async function loadPricingTable(){
  try{ const {pricing} = await api('/api/payments/pricing'); pricingTable = pricing; }
  catch(e){ pricingTable = null; }
}
function subscriptionView(){
  const renewsOn = S.profile.premiumUntil ? new Date(S.profile.premiumUntil).toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'}) : null;
  const myPricing = pricingTable ? pricingTable[guessRegionFast()] : null;
  return `
  <div class="page-head"><h1>${t('subscription')}</h1></div>
  <p class="muted" style="max-width:640px;">${t('sub_intro')}</p>
  <div class="row row-2" style="align-items:stretch;">
    <div class="card">
      <h3>${t('free_plan')}</h3><p class="muted" style="font-size:13px;">${t('free_plan_desc')}</p>
      <ul style="padding-left:18px;font-size:13.5px;line-height:1.9;">
        <li>${t('free_f1')}</li><li>${t('free_f2')}</li><li>${t('free_f3')}</li>
        <li>${t('free_f4')}</li><li>${t('free_f5')}</li><li>${t('free_f6')}</li>
        <li>${t('free_f7')}</li><li>${t('free_f8')}</li>
      </ul>
      ${!isPremium() ? `<span class="badge badge-outline">${t('current_plan')}</span>` : ''}
    </div>
    <div class="card" style="border-color:var(--gold);">
      <h3>${t('premium_plan')} <span class="badge badge-gold">${t('best_value')}</span></h3><p class="muted" style="font-size:13px;">${t('premium_plan_desc')}</p>
      <ul style="padding-left:18px;font-size:13.5px;line-height:1.9;">
        <li>${t('prem_f1')}</li><li>${t('prem_f2')}</li><li>${t('prem_f3')}</li>
        <li>${t('prem_f4')}</li><li>${t('prem_f5')}</li><li>${t('prem_f6')}</li>
        <li>${t('prem_f7')}</li><li>${t('prem_f8')}</li><li>${t('prem_f9')}</li><li>${t('prem_f10')}</li>
      </ul>
      ${isPremium() ? `
        <span class="badge badge-accent">${t('current_plan')}</span>
        ${renewsOn ? `<p class="muted" style="font-size:12.5px;margin-top:8px;">${t('renews_on',{date:renewsOn})}</p>` : ''}
        <button class="btn btn-sm" id="cancel-btn" style="margin-top:6px;">${t('cancel_auto_renewal')}</button>
      ` : `
        ${myPricing ? `<div style="margin:10px 0 14px;font-size:13px;color:var(--text-2);">${t('your_price')} <strong style="color:var(--text);">${myPricing.label}/mo</strong></div>` : ''}
        <button class="btn btn-gold" id="upgrade-btn">${t('upgrade')}${myPricing?' — '+myPricing.label+'/mo':''}</button>
      `}
    </div>
  </div>`;
}
function bindSubscription(){
  const up = document.getElementById('upgrade-btn');
  if(up){
    if(!pricingTable){
      loadPricingTable().then(()=>{ if(currentRoute().route==='subscription') render(); });
    }
    up.addEventListener('click', async ()=>{
      const old = up.innerHTML; up.innerHTML = '<span class="spinner"></span> Redirecting...'; up.disabled = true;
      try{
        const {paymentLink} = await api('/api/payments/initialize', {method:'POST'});
        window.location.href = paymentLink;
      }catch(e){ toast(e.message); up.innerHTML = old; up.disabled = false; }
    });
  }
  const cancelBtn = document.getElementById('cancel-btn');
  if(cancelBtn) cancelBtn.addEventListener('click', async ()=>{
    if(!confirm(t('confirm_cancel_sub'))) return;
    const old = cancelBtn.innerHTML; cancelBtn.innerHTML = '<span class="spinner"></span>'; cancelBtn.disabled = true;
    try{
      const {message} = await api('/api/payments/cancel', {method:'POST'});
      toast(message);
      cancelBtn.remove();
    }catch(e){ toast(e.message); cancelBtn.innerHTML = old; cancelBtn.disabled = false; }
  });
}

/* ===================== BOOT ===================== */
boot();