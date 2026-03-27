import { Song, Collection, FavoriteCategory } from './types';

// Collections
export const collections: Collection[] = [
  {
    id: 'hc-kinyarwanda',
    name: 'Hymnes et Cantiques',
    language: 'Kinyarwanda',
    description: 'Traditional hymns and songs in Kinyarwanda',
    songCount: 455,
  },
  {
    id: 'hc-ewe',
    name: 'Hymnes et Cantiques',
    language: 'Ewe',
    description: 'Traditional hymns and songs in Ewe',
    songCount: 412,
  },
  {
    id: 'praise-songs',
    name: 'Praise & Worship',
    language: 'Kinyarwanda',
    description: 'Contemporary praise songs',
    songCount: 156,
  },
];

// Sample songs data
export const songs: Song[] = [
  {
    id: '1',
    number: 1,
    title: 'TURAGUSINGIZA DATA',
    subtitle: 'Kticyubahiro',
    collection: 'hc-kinyarwanda',
    language: 'Kinyarwanda',
    type: 'hymn',
    verses: [
      {
        number: 1,
        type: 'verse',
        lines: [
          'Turagusingiza Data,',
          "Wow'utuye mu mucyo mwinshi,",
          'Urondora ibiyo mu ijuru.',
          'Duteraniye neza yawe',
          "Kubw'urukundo rwawe rwinshi,",
          'Tugushima bitangiye.',
        ],
      },
      {
        number: 2,
        type: 'verse',
        lines: [
          'Shimwa, habw'ikuzo, Muremyi wa byose:',
          'Alleluya, shimwa, kuzwa, Man'ikiza!',
          'Alleluya, Alleluya!',
        ],
      },
      {
        number: 3,
        type: 'verse',
        lines: [
          'Watviriye nk'umucyo,',
          'Mana Data, ni kw'ubuntu,',
          'Muri Yesu, Umwana wkunda.',
          'Kubwe ubugingo bwacu',
          'Burakuramya, bugushima,',
          'Bukwamariza aho uri.',
        ],
      },
      {
        type: 'chorus',
        lines: [
          'Shimwa, habwa ikuzo, Muremyi wa byose:',
          'Alleluya, shimwa, kuzwa, Man'ikiza!',
          'Alleluya, Alleluya!',
        ],
      },
    ],
  },
  {
    id: '2',
    number: 2,
    title: 'DATA WACU MWIZA',
    subtitle: 'Twebwe abana bawe',
    collection: 'hc-kinyarwanda',
    language: 'Kinyarwanda',
    type: 'hymn',
    verses: [
      {
        number: 1,
        type: 'verse',
        lines: [
          'Data wacu mwiza,',
          'Twebwe abana bawe',
          'Turaza imbere yawe',
          'Kugira tugushime.',
        ],
      },
      {
        number: 2,
        type: 'verse',
        lines: [
          'Wowe utugiriye ubuntu,',
          'Utwubahiriza cyane,',
          'Turashaka kukuhesha icyubahiro,',
          'Kandi tukakwizeza.',
        ],
      },
      {
        type: 'refrain',
        lines: [
          'Uwiteka, ni wowe Data,',
          'Turagukunda cyane,',
          'Tugushima kandi tukakwubaha,',
          'Wowe Mwami wacu mukuru.',
        ],
      },
    ],
  },
  {
    id: '3',
    number: 3,
    title: 'IMANA YACU NINI',
    subtitle: 'Uburenganzira bwawe',
    collection: 'hc-kinyarwanda',
    language: 'Kinyarwanda',
    type: 'hymn',
    verses: [
      {
        number: 1,
        type: 'verse',
        lines: [
          'Imana yacu nini,',
          'Wowe ufite uburenganzira bwinshi,',
          'Isi yose irawe,',
          'Ibyinshi byose ni ibyawe.',
        ],
      },
      {
        number: 2,
        type: 'verse',
        lines: [
          'Uduhesha ubuzima,',
          'Ugatwubaka buri munsi,',
          'Ugatugirira ubuntu,',
          'Muri byose tukeneye.',
        ],
      },
    ],
  },
  {
    id: '15',
    number: 15,
    title: 'YESU MUKIZA WACU',
    subtitle: 'Ngo aze kutubohora',
    collection: 'hc-kinyarwanda',
    language: 'Kinyarwanda',
    type: 'hymn',
    verses: [
      {
        number: 1,
        type: 'verse',
        lines: [
          'Yesu Mukiza wacu,',
          'Ngo aze kutubohora,',
          'Yahawe icyubahiro,',
          'Natwe tugashimira.',
        ],
      },
      {
        type: 'chorus',
        lines: [
          'Aho ni ho, aho ni ho,',
          'Yesu Mukiza wacu',
          'Yahawe icyubahiro,',
          'Natwe tugashimira.',
        ],
      },
    ],
  },
  {
    id: '23',
    number: 23,
    title: 'MWAMI DATA REMERA',
    subtitle: 'Abantu bawe benshi',
    collection: 'hc-kinyarwanda',
    language: 'Kinyarwanda',
    type: 'hymn',
    verses: [
      {
        number: 1,
        type: 'verse',
        lines: [
          'Mwami Data remera,',
          'Abantu bawe benshi,',
          'Maze kwizera ubwo,',
          'Ngo uzabaha icyubahiro.',
        ],
      },
    ],
  },
  {
    id: '50',
    number: 50,
    title: 'TURI HANO TWESE',
    subtitle: 'Dukurikire Yesu',
    collection: 'hc-kinyarwanda',
    language: 'Kinyarwanda',
    type: 'hymn',
    verses: [
      {
        number: 1,
        type: 'verse',
        lines: [
          'Turi hano twese,',
          'Dukurikire Yesu,',
          'Tuzamwubaha kandi,',
          'Tugamuhezagize.',
        ],
      },
      {
        number: 2,
        type: 'verse',
        lines: [
          'Yesu ni Mwami wacu,',
          'Ni we dutungire,',
          'Azadufasha buri gihe,',
          'Muri ibihe byose.',
        ],
      },
    ],
  },
  {
    id: '100',
    number: 100,
    title: 'URUKUNDO RWA DATA',
    subtitle: 'Ni runini cyane',
    collection: 'hc-kinyarwanda',
    language: 'Kinyarwanda',
    type: 'hymn',
    verses: [
      {
        number: 1,
        type: 'verse',
        lines: [
          'Urukundo rwa Data,',
          'Ni runini cyane,',
          'Rwahaye Umwana we,',
          'Kugira atubohore.',
        ],
      },
    ],
  },
];

// Generate more songs for browsing (up to 200)
for (let i = 4; i <= 200; i++) {
  if (![15, 23, 50, 100].includes(i)) {
    songs.push({
      id: `${i}`,
      number: i,
      title: `Indirimbo Nziza ${i}`,
      subtitle: 'Turashima Imana',
      collection: 'hc-kinyarwanda',
      language: 'Kinyarwanda',
      type: 'hymn',
      verses: [
        {
          number: 1,
          type: 'verse',
          lines: [
            'Indirimbo nziza ya Imana,',
            'Iyi twemera kandi turemera,',
            'Yesu Mukiza wacu ni mwiza,',
            'Azadufasha kandi atudukure.',
          ],
        },
        {
          type: 'chorus',
          lines: [
            'Alleluya, alleluya,',
            'Tugushima Mwami wacu,',
            'Alleluya, alleluya,',
            'Wowe ukiza wacu.',
          ],
        },
      ],
    });
  }
}

// Default favorite categories
export const defaultFavoriteCategories: FavoriteCategory[] = [
  {
    id: 'sunday-worship',
    name: 'Sunday Worship',
    songIds: ['1', '2', '50'],
    createdAt: new Date('2026-01-15'),
  },
  {
    id: 'evening-prayers',
    name: 'Evening Prayers',
    songIds: ['15', '23'],
    createdAt: new Date('2026-02-01'),
  },
];
