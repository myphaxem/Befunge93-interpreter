import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface Sample {
  id: string;
  name: string;
  description: string;
}

const samples: Sample[] = [
  { id: 'hello', name: 'hello_world.bf', description: 'Hello World' },
  { id: 'cat', name: 'cat.bf', description: 'Cat program' },
  { id: 'sieve', name: 'sieve.bf', description: 'Sieve of Eratosthenes' },
  { id: 'random', name: 'random.bf', description: 'Random number generator' },
];

export default function SampleCarousel({ onSelectSample }: { onSelectSample: (id: string) => void }) {
  return (
    <div style={{ width: 300, userSelect: 'none' }}>
      <Swiper
        modules={[Navigation, Pagination]}
        spaceBetween={10}
        slidesPerView={1}
        navigation
        pagination={{ clickable: true }}
        style={{ padding: '10px 0' }}
      >
        {samples.map((sample) => (
          <SwiperSlide key={sample.id}>
            <div
              onClick={() => onSelectSample(sample.id)}
              style={{
                padding: 20,
                background: '#1a1d23',
                borderRadius: 8,
                border: '1px solid #2a2f36',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#4a9eff';
                e.currentTarget.style.background = '#1f2329';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#2a2f36';
                e.currentTarget.style.background = '#1a1d23';
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#e8eaed' }}>
                {sample.name}
              </div>
              <div style={{ fontSize: 12, color: '#9aa4af' }}>
                {sample.description}
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
