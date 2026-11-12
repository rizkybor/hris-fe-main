// Motivational quote under the dashboard greeting, one per day.
//
// There are 31 quotes (a prime number). The day's quote is picked with
// (day × 13) mod 31, a permutation of the list, so any 31 days in a row
// show 31 different quotes: never a repeat within a week, and the same
// weekday doesn't get the same quote the next week either. Everyone sees
// the same quote on the same day.
export const QUOTES = [
  { source: "Alan Kay", en: "The best way to predict the future is to invent it.", id: "Cara terbaik memprediksi masa depan adalah dengan menciptakannya." },
  { source: "Edsger W. Dijkstra", en: "Simplicity is prerequisite for reliability.", id: "Kesederhanaan adalah syarat utama keandalan." },
  { source: "Steve Jobs", en: "The only way to do great work is to love what you do.", id: "Satu-satunya cara menghasilkan karya hebat adalah mencintai apa yang Anda kerjakan." },
  { source: "Steve Jobs", en: "Design is not just what it looks like and feels like. Design is how it works.", id: "Desain bukan sekadar tampilan dan rasanya. Desain adalah cara sesuatu bekerja." },
  { source: "Sheryl Sandberg", en: "Done is better than perfect.", id: "Selesai lebih baik daripada sempurna." },
  { source: "Michael Jordan", en: "Talent wins games, but teamwork and intelligence win championships.", id: "Bakat memenangkan pertandingan, tetapi kerja sama dan kecerdasan memenangkan kejuaraan." },
  { source: "Helen Keller", en: "Alone we can do so little; together we can do so much.", id: "Sendiri kita hanya bisa berbuat sedikit; bersama kita bisa berbuat banyak." },
  { source: "Peribahasa Afrika", sourceEn: "African proverb", en: "If you want to go fast, go alone. If you want to go far, go together.", id: "Jika ingin berjalan cepat, berjalanlah sendiri. Jika ingin berjalan jauh, berjalanlah bersama." },
  { source: "Ralph Marston", en: "Excellence is not a skill. It is an attitude.", id: "Keunggulan bukanlah keterampilan. Keunggulan adalah sikap." },
  { source: "Ki Hajar Dewantara", en: "Lead by example in front, build spirit in the middle, give support from behind.", id: "Ing ngarsa sung tuladha, ing madya mangun karsa, tut wuri handayani." },
  { source: "R.A. Kartini", en: "After darkness comes light.", id: "Habis gelap terbitlah terang." },
  { source: "Sutan Sjahrir", en: "A life that is never put at stake will never be won.", id: "Hidup yang tidak dipertaruhkan tidak akan pernah dimenangkan." },
  { source: "Peribahasa Tiongkok", sourceEn: "Chinese proverb", en: "The best time to plant a tree was twenty years ago. The second best time is now.", id: "Waktu terbaik menanam pohon adalah dua puluh tahun lalu. Waktu terbaik kedua adalah sekarang." },
  { source: "Benjamin Franklin", en: "Well done is better than well said.", id: "Dikerjakan dengan baik lebih berarti daripada diucapkan dengan baik." },
  { source: "Benjamin Franklin", en: "Energy and persistence conquer all things.", id: "Semangat dan ketekunan menaklukkan segala hal." },
  { source: "Vincent van Gogh", en: "Great things are done by a series of small things brought together.", id: "Hal-hal besar tercipta dari rangkaian hal kecil yang disatukan." },
  { source: "Thomas A. Edison", en: "Genius is one percent inspiration and ninety-nine percent perspiration.", id: "Kejeniusan adalah satu persen inspirasi dan sembilan puluh sembilan persen kerja keras." },
  { source: "Sun Tzu", en: "Opportunities multiply as they are seized.", id: "Peluang berlipat ganda ketika diraih." },
  { source: "Kent Beck", en: "Make it work, make it right, make it fast.", id: "Buat berjalan, buat benar, lalu buat cepat." },
  { source: "Harold Abelson", en: "Programs must be written for people to read, and only incidentally for machines to execute.", id: "Program harus ditulis untuk dibaca manusia, dan hanya kebetulan untuk dijalankan mesin." },
  { source: "Martin Fowler", en: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", id: "Siapa pun bisa menulis kode yang dipahami komputer. Programmer yang baik menulis kode yang dipahami manusia." },
  { source: "Charles Eames", en: "The details are not the details. They make the design.", id: "Detail bukan sekadar detail. Detail-lah yang membentuk desain." },
  { source: "Dieter Rams", en: "Good design is as little design as possible.", id: "Desain yang baik adalah desain yang sesedikit mungkin." },
  { source: "Wayne Gretzky", en: "You miss one hundred percent of the shots you don't take.", id: "Anda pasti gagal pada setiap tembakan yang tidak pernah Anda lakukan." },
  { source: "Theodore Roosevelt", en: "Do what you can, with what you have, where you are.", id: "Lakukan apa yang Anda bisa, dengan apa yang Anda punya, di mana pun Anda berada." },
  { source: "Tim Notke", en: "Hard work beats talent when talent doesn't work hard.", id: "Kerja keras mengalahkan bakat ketika bakat tidak bekerja keras." },
  { source: "Jim Rohn", en: "Discipline is the bridge between goals and accomplishment.", id: "Disiplin adalah jembatan antara tujuan dan pencapaian." },
  { source: "Robin Sharma", en: "Small daily improvements over time lead to stunning results.", id: "Perbaikan kecil setiap hari, seiring waktu, menghasilkan pencapaian yang luar biasa." },
  { source: "Henry Ford", en: "Whether you think you can, or you think you can't, you're right.", id: "Entah Anda yakin bisa atau yakin tidak bisa, Anda benar." },
  { source: "Soekarno", en: "Hang your dreams as high as the sky.", id: "Gantungkan cita-citamu setinggi langit." },
  { source: "Mohammad Hatta", en: "A lack of intelligence can be fixed by learning, a lack of skill by experience, but dishonesty is hard to fix.", id: "Kurang cerdas dapat diperbaiki dengan belajar, kurang cakap dapat dihilangkan dengan pengalaman, namun tidak jujur sulit diperbaiki." },
];

// Days since 1970-01-01 in local time, so the quote turns over at local midnight.
const localDayNumber = (date) => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);

export const quoteForDate = (date = new Date(), locale = "id") => {
  const q = QUOTES[(((localDayNumber(date) * 13) % QUOTES.length) + QUOTES.length) % QUOTES.length];
  return { text: q[locale] || q.en, source: (locale === "en" && q.sourceEn) || q.source };
};
