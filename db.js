const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'heritage_realtor.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS site_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS properties (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    type        TEXT    NOT NULL CHECK(type IN ('apartment','land')),
    listing     TEXT    NOT NULL CHECK(listing IN ('sale','rent','lease','jv','shortlet')),
    price       INTEGER NOT NULL,
    location    TEXT    NOT NULL,
    bedrooms    INTEGER,
    bathrooms   INTEGER,
    size        TEXT    NOT NULL,
    parking     INTEGER DEFAULT 0,
    pool        INTEGER DEFAULT 0,
    gym         INTEGER DEFAULT 0,
    security    INTEGER DEFAULT 0,
    furnished   INTEGER DEFAULT 0,
    gradient    TEXT,
    icon        TEXT,
    description TEXT,
    verified    INTEGER DEFAULT 0,
    pay_monthly INTEGER DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS enquiries (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    phone         TEXT NOT NULL,
    email         TEXT,
    interest      TEXT,
    property_type TEXT,
    message       TEXT,
    property_id   INTEGER REFERENCES properties(id),
    status        TEXT DEFAULT 'new',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Add images column if it doesn't exist (migration)
const cols = db.prepare("PRAGMA table_info(properties)").all().map(c => c.name);
if (!cols.includes('images')) {
  db.exec("ALTER TABLE properties ADD COLUMN images TEXT DEFAULT '[]'");
}
if (!cols.includes('verified')) {
  db.exec("ALTER TABLE properties ADD COLUMN verified INTEGER DEFAULT 0");
}
if (!cols.includes('pay_monthly')) {
  db.exec("ALTER TABLE properties ADD COLUMN pay_monthly INTEGER DEFAULT 0");
}

// Migrate CHECK constraint to include 'shortlet' if not already done
const tblSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='properties'").get();
if (tblSql && !tblSql.sql.includes('shortlet')) {
  db.exec(`
    CREATE TABLE properties_new AS SELECT * FROM properties WHERE 0;
    DROP TABLE properties_new;
    CREATE TABLE properties_new (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT    NOT NULL,
      type        TEXT    NOT NULL CHECK(type IN ('apartment','land')),
      listing     TEXT    NOT NULL CHECK(listing IN ('sale','rent','lease','jv','shortlet')),
      price       INTEGER NOT NULL,
      location    TEXT    NOT NULL,
      bedrooms    INTEGER,
      bathrooms   INTEGER,
      size        TEXT    NOT NULL,
      parking     INTEGER DEFAULT 0,
      pool        INTEGER DEFAULT 0,
      gym         INTEGER DEFAULT 0,
      security    INTEGER DEFAULT 0,
      furnished   INTEGER DEFAULT 0,
      gradient    TEXT,
      icon        TEXT,
      description TEXT,
      images      TEXT    DEFAULT '[]',
      verified    INTEGER DEFAULT 0,
      pay_monthly INTEGER DEFAULT 0,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO properties_new (id,title,type,listing,price,location,bedrooms,bathrooms,size,parking,pool,gym,security,furnished,gradient,icon,description,images,created_at)
      SELECT id,title,type,listing,price,location,bedrooms,bathrooms,size,parking,pool,gym,security,furnished,gradient,icon,description,images,created_at FROM properties;
    DROP TABLE properties;
    ALTER TABLE properties_new RENAME TO properties;
  `);
}

// Seed properties on first run
const { count } = db.prepare('SELECT COUNT(*) AS count FROM properties').get();

if (count === 0) {
  const seed = [
    { title:'Luxury 3-Bed Apartment',   type:'apartment', listing:'sale', price:45000000,  location:'Victoria Island, Lagos',    bedrooms:3, bathrooms:2, size:'180 sqm',  parking:1, pool:1, gym:0, security:1, furnished:1, gradient:'linear-gradient(135deg,#667eea,#764ba2)', icon:'🏢', description:'A stunning luxury apartment in the heart of Victoria Island featuring spacious rooms, modern fittings, and panoramic views. Located within a secured estate with 24/7 power supply.' },
    { title:'2-Bedroom Flat',            type:'apartment', listing:'rent', price:1200000,   location:'Lekki Phase 1, Lagos',       bedrooms:2, bathrooms:1, size:'110 sqm',  parking:1, pool:0, gym:0, security:1, furnished:0, gradient:'linear-gradient(135deg,#f093fb,#f5576c)', icon:'🏠', description:'Spacious 2-bedroom flat in a serene neighborhood in Lekki Phase 1. Perfect for small families or young professionals. Close to schools, markets, and major roads.' },
    { title:'Residential Plot of Land',  type:'land',      listing:'sale', price:12000000,  location:'Ajah, Lagos',                bedrooms:null, bathrooms:null, size:'500 sqm',  parking:0, pool:0, gym:0, security:0, furnished:0, gradient:'linear-gradient(135deg,#4facfe,#00f2fe)', icon:'🌿', description:'A dry, leveled, and survey-documented residential plot in the fast-developing area of Ajah. Suitable for residential or commercial development. C of O available.' },
    { title:'4-Bedroom Duplex',          type:'apartment', listing:'sale', price:95000000,  location:'Asokoro, Abuja',             bedrooms:4, bathrooms:3, size:'320 sqm',  parking:1, pool:1, gym:1, security:1, furnished:1, gradient:'linear-gradient(135deg,#43e97b,#38f9d7)', icon:'🏡', description:'Premium 4-bedroom duplex in the exclusive Asokoro district of Abuja. Features a private pool, gym, smart home technology, and 24/7 security.' },
    { title:'Studio Apartment',          type:'apartment', listing:'rent', price:650000,    location:'Garki, Abuja',               bedrooms:1, bathrooms:1, size:'55 sqm',   parking:1, pool:0, gym:0, security:1, furnished:1, gradient:'linear-gradient(135deg,#fa709a,#fee140)', icon:'🏢', description:'Compact and fully furnished studio apartment ideal for singles and young professionals. Located in the central Garki district with easy access to government offices and business centers.' },
    { title:'Commercial Land',           type:'land',      listing:'sale', price:35000000,  location:'Trans-Amadi, Port Harcourt', bedrooms:null, bathrooms:null, size:'1200 sqm', parking:0, pool:0, gym:0, security:0, furnished:0, gradient:'linear-gradient(135deg,#a18cd1,#fbc2eb)', icon:'🌱', description:'Prime commercial land in the industrial hub of Trans-Amadi, Port Harcourt. Strategically located near oil companies and commercial centers. Title documents intact.' },
    { title:'Mini Flat',                 type:'apartment', listing:'rent', price:450000,    location:'Bodija, Ibadan',             bedrooms:1, bathrooms:1, size:'60 sqm',   parking:1, pool:0, gym:0, security:0, furnished:0, gradient:'linear-gradient(135deg,#fccb90,#d57eeb)', icon:'🏠', description:'Clean and affordable mini flat in the popular Bodija area of Ibadan. Suitable for students, young workers, and small families. Close to UI and major hospitals.' },
    { title:'Farm Land',                 type:'land',      listing:'sale', price:8500000,   location:'Epe, Lagos',                 bedrooms:null, bathrooms:null, size:'5000 sqm', parking:0, pool:0, gym:0, security:0, furnished:0, gradient:'linear-gradient(135deg,#84fab0,#8fd3f4)', icon:'🌾', description:'Large farm land perfect for agricultural purposes. Fertile soil, accessible road, and close to water source. Ideal for crop farming, poultry, or fish farming.' },
    { title:'3-Bedroom Terrace',         type:'apartment', listing:'rent', price:2800000,   location:'Maitama, Abuja',             bedrooms:3, bathrooms:2, size:'200 sqm',  parking:1, pool:0, gym:0, security:1, furnished:0, gradient:'linear-gradient(135deg,#30cfd0,#330867)', icon:'🏘️', description:'Beautiful 3-bedroom terrace house in the prestigious Maitama area. Features a spacious living room, modern kitchen, and a private garden. Within a gated estate.' },
    { title:'Serviced Land',             type:'land',      listing:'rent', price:600000,    location:'Ibeju-Lekki, Lagos',         bedrooms:null, bathrooms:null, size:'600 sqm',  parking:0, pool:0, gym:0, security:0, furnished:0, gradient:'linear-gradient(135deg,#fddb92,#d1fdff)', icon:'🌿', description:'Serviced land available for lease in the rapidly developing Ibeju-Lekki corridor. Suitable for warehousing, storage, or temporary commercial use.' },
    { title:'Penthouse Apartment',       type:'apartment', listing:'sale', price:180000000, location:'Ikoyi, Lagos',               bedrooms:5, bathrooms:4, size:'480 sqm',  parking:1, pool:1, gym:1, security:1, furnished:1, gradient:'linear-gradient(135deg,#0f0c29,#302b63)', icon:'🏙️', description:'Ultra-luxury penthouse in the exclusive Ikoyi neighborhood. Spanning 2 floors with breathtaking views of the Lagos lagoon. Features private elevator, rooftop terrace, and world-class finishes.' },
    { title:'Corner Plot',               type:'land',      listing:'sale', price:22000000,  location:'Gwarinpa, Abuja',            bedrooms:null, bathrooms:null, size:'800 sqm',  parking:0, pool:0, gym:0, security:0, furnished:0, gradient:'linear-gradient(135deg,#c1dfc4,#deecdd)', icon:'🌳', description:'A well-positioned corner plot in the largest residential district of Abuja — Gwarinpa. Strategic location great for building a duplex or block of flats. R of O available.' },
    { title:'3-Bedroom Bungalow',        type:'apartment', listing:'sale', price:28000000,  location:'GRA, Kaduna',                bedrooms:3, bathrooms:2, size:'220 sqm',  parking:1, pool:0, gym:0, security:1, furnished:0, gradient:'linear-gradient(135deg,#f7971e,#ffd200)', icon:'🏡', description:'Spacious 3-bedroom bungalow in the serene GRA area of Kaduna. Set on a large compound with modern fittings, ample parking, and 24/7 security. Great for families.' },
    { title:'Residential Plot',          type:'land',      listing:'sale', price:6500000,   location:'Ungwan Rimi, Kaduna',        bedrooms:null, bathrooms:null, size:'450 sqm',  parking:0, pool:0, gym:0, security:0, furnished:0, gradient:'linear-gradient(135deg,#56ab2f,#a8e063)', icon:'🌿', description:'Affordable residential plot in the developing Ungwan Rimi district of Kaduna. Suitable for building a family home. Survey documents and title papers available.' },
    { title:'2-Bedroom Flat',            type:'apartment', listing:'rent', price:700000,    location:'Nassarawa GRA, Kano',        bedrooms:2, bathrooms:1, size:'95 sqm',   parking:1, pool:0, gym:0, security:1, furnished:0, gradient:'linear-gradient(135deg,#373b44,#4286f4)', icon:'🏠', description:'Clean and well-maintained 2-bedroom flat in the popular Nassarawa GRA of Kano. Located in a quiet street with good road access, close to markets and schools.' },
    { title:'Commercial Land',           type:'land',      listing:'sale', price:18000000,  location:'Sabon Gari, Kano',           bedrooms:null, bathrooms:null, size:'900 sqm',  parking:0, pool:0, gym:0, security:0, furnished:0, gradient:'linear-gradient(135deg,#cb2d3e,#ef473a)', icon:'🌱', description:'Prime commercial land in the heart of Sabon Gari, Kano\'s busiest commercial district. Ideal for shopping plaza, office complex, or warehouse. C of O available.' },
    { title:'4-Bedroom Terrace',         type:'apartment', listing:'rent', price:2200000,   location:'Old GRA, Port Harcourt',     bedrooms:4, bathrooms:3, size:'280 sqm',  parking:1, pool:0, gym:0, security:1, furnished:0, gradient:'linear-gradient(135deg,#1a1a2e,#16213e)', icon:'🏘️', description:'Spacious 4-bedroom terrace house in the prestigious Old GRA of Port Harcourt. Features a large compound, modern kitchen, and sits within a gated community with 24/7 security.' },
    { title:'Waterfront Land',           type:'land',      listing:'sale', price:42000000,  location:'Rumuola, Port Harcourt',     bedrooms:null, bathrooms:null, size:'2000 sqm', parking:0, pool:0, gym:0, security:0, furnished:0, gradient:'linear-gradient(135deg,#0f3460,#533483)', icon:'🌊', description:'Rare waterfront land in Rumuola, Port Harcourt. Ideal for luxury residential or hospitality development. Survey and title documents available. A prime investment opportunity.' },
  ];

  const insert = db.prepare(`
    INSERT INTO properties
      (title, type, listing, price, location, bedrooms, bathrooms, size, parking, pool, gym, security, furnished, gradient, icon, description)
    VALUES
      (@title, @type, @listing, @price, @location, @bedrooms, @bathrooms, @size, @parking, @pool, @gym, @security, @furnished, @gradient, @icon, @description)
  `);

  db.transaction(() => seed.forEach(p => insert.run(p)))();
  console.log(`Seeded ${seed.length} properties into the database.`);
}

// Seed default site settings on first run
const settingsCount = db.prepare('SELECT COUNT(*) AS count FROM site_settings').get().count;
if (settingsCount === 0) {
  const setSetting = db.prepare('INSERT INTO site_settings (key, value) VALUES (?, ?)');
  const defaults = [
    ['contact_address', '15 Marina Road, Victoria Island, Lagos, Nigeria'],
    ['contact_phone',   '+234 800 000 0001'],
    ['contact_email',   'info@heritagerealtors.ng'],
    ['contact_hours',   'Monday – Saturday: 8am – 6pm'],
    ['whatsapp_number', '2347031946419'],
    ['stat1_num',       '1,200+'], ['stat1_label', 'Properties Listed'],
    ['stat2_num',       '850+'],   ['stat2_label', 'Happy Clients'],
    ['stat3_num',       '18+'],    ['stat3_label', 'Cities Covered'],
    ['stat4_num',       '98%'],    ['stat4_label', 'Satisfaction Rate'],
    ['about_title',     'We Help You Find the Right Property at the Right Price'],
    ['about_para1',     'Heritage Realtor is a leading real estate company in Nigeria with over 15 years of experience helping individuals and businesses find, buy, sell, and rent properties across major cities.'],
    ['about_para2',     'Our team of certified agents ensures every transaction is transparent, secure, and stress-free. We handle everything from property search to documentation and handover.'],
    ['about_years_exp', '15+'], ['about_clients', '850+'],
    ['about_properties','1200+'], ['about_cities', '18'],
  ];
  db.transaction(() => defaults.forEach(([k, v]) => setSetting.run(k, v)))();
}

// Add whatsapp_number setting if it doesn't exist yet (migration for existing DBs)
const hasWa = db.prepare("SELECT 1 FROM site_settings WHERE key = 'whatsapp_number'").get();
if (!hasWa) {
  db.prepare("INSERT INTO site_settings (key, value) VALUES ('whatsapp_number', '2347031946419')").run();
}

// Override ADMIN_PASSWORD from DB if a custom one has been saved
const savedPwd = db.prepare("SELECT value FROM site_settings WHERE key = 'admin_password'").get();
if (savedPwd) process.env.ADMIN_PASSWORD = savedPwd.value;

module.exports = db;
