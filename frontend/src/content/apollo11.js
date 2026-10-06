// Apollo 11 mission brief for the home page. Facts checked against NASA's
// Apollo 11 mission pages; photos from the NASA Image and Video Library
// (public domain), saved in src/assets/apollo-11.
import aldrin from '@/assets/apollo-11/aldrin-as11-40-5903.jpg'
import bootprint from '@/assets/apollo-11/bootprint-as11-40-5878.jpg'
import crew from '@/assets/apollo-11/crew-s69-31739.jpg'
import eagle from '@/assets/apollo-11/eagle-as11-44-6642.jpg'
import launch from '@/assets/apollo-11/launch-s69-39529.jpg'
import missionControl from '@/assets/apollo-11/mission-control-s69-40024.jpg'
import recovery from '@/assets/apollo-11/recovery-s69-21698.jpg'

export const nasaImageUrl = (nasaId) => `https://images.nasa.gov/details/${nasaId}`

export const SUMMARY = [
  'Apollo 11 was the first mission to land people on the Moon. A Saturn V rocket launched Neil Armstrong, Michael Collins and Edwin “Buzz” Aldrin from Launch Pad 39A at Kennedy Space Center on July 16, 1969.',
  'On July 20, Armstrong and Aldrin landed the lunar module Eagle in the Sea of Tranquility while Collins orbited overhead in the command module Columbia. After more than two and a half hours exploring the surface, the crew headed home and splashed down in the Pacific Ocean on July 24.',
]

export const FACTS = [
  { label: 'Launch', value: 'JUL 16 1969', detail: '9:32 a.m. EDT · Pad 39A' },
  { label: 'Landing', value: 'JUL 20 1969', detail: 'Sea of Tranquility' },
  { label: 'Moonwalk', value: '2½ HOURS+', detail: 'Armstrong and Aldrin' },
  { label: 'Splashdown', value: 'JUL 24 1969', detail: 'Pacific Ocean · USS Hornet' },
  { label: 'Duration', value: '195:18:35', detail: 'Hours, minutes, seconds' },
]

export const CREW = [
  { name: 'Neil A. Armstrong', role: 'Commander' },
  { name: 'Michael Collins', role: 'Command module pilot · Columbia' },
  { name: 'Edwin “Buzz” Aldrin Jr.', role: 'Lunar module pilot · Eagle' },
]

export const HERO_IMAGE = {
  src: launch,
  width: 1280,
  height: 1253,
  nasaId: 'S69-39529',
  alt: 'The Saturn V rocket carrying Apollo 11 lifts off from Launch Pad 39A beside its red launch tower, surrounded by exhaust clouds.',
  caption: 'Liftoff from Pad 39A, 9:32 a.m. EDT, July 16, 1969.',
}

export const GALLERY = [
  {
    src: crew,
    width: 640,
    height: 502,
    nasaId: 'S69-31739',
    date: 'May 1969',
    title: 'The crew',
    alt: 'Armstrong, Collins and Aldrin in white spacesuits in front of a large image of the Moon.',
    caption: 'Neil Armstrong, Michael Collins and Buzz Aldrin, two months before launch.',
  },
  {
    src: aldrin,
    width: 640,
    height: 624,
    nasaId: 'AS11-40-5903',
    // Keep his helmet in frame when the card crops to 4:3.
    position: '50% 10%',
    date: 'July 20, 1969',
    title: 'Aldrin on the Moon',
    alt: 'Buzz Aldrin in his spacesuit standing on the lunar surface, the photographer reflected in his gold visor.',
    caption: 'Buzz Aldrin walks near Eagle. Neil Armstrong took the photo.',
  },
  {
    src: bootprint,
    width: 637,
    height: 640,
    nasaId: 'AS11-40-5878',
    date: 'July 20, 1969',
    title: 'Bootprint',
    alt: 'Close-up of a ridged bootprint pressed into fine grey lunar soil.',
    caption: 'An astronaut’s bootprint in the lunar soil.',
  },
  {
    src: eagle,
    width: 640,
    height: 492,
    nasaId: 'AS11-44-6642',
    date: 'July 21, 1969',
    title: 'Eagle returns',
    alt: 'The lunar module ascent stage above the grey lunar surface, with a half-lit Earth rising beyond the horizon.',
    caption: 'Eagle’s ascent stage rises to meet Columbia, with Earth beyond.',
  },
  {
    src: recovery,
    width: 636,
    height: 640,
    nasaId: 'S69-21698',
    date: 'July 24, 1969',
    title: 'Splashdown',
    alt: 'The Columbia capsule floating in the dark blue Pacific beside an orange life raft holding the crew.',
    caption: 'The crew waits in a raft beside Columbia for a helicopter from USS Hornet.',
  },
  {
    src: missionControl,
    width: 425,
    height: 640,
    nasaId: 'S69-40024',
    date: 'July 24, 1969',
    title: 'Mission Control celebrates',
    alt: 'Black-and-white photo of officials and flight controllers waving small American flags in Mission Control.',
    caption: 'Flight controllers and officials in the Mission Operations Control Room after splashdown.',
  },
]
