import { useEffect, useRef } from 'react';

const reviews: Record<number, { title: string; text: string; action: string }> = {
  0: {
    title: 'ลองครบทั้ง 4 ทิศแล้ว',
    text: 'W ขึ้น · A ซ้าย · S ลง · D ขวา ใช้ลูกศรแทนได้ เกมหยุดรอแล้ว อ่านทบทวนได้จนกว่าจะพร้อม',
    action: 'พร้อมแล้ว ไปฝึกเร่งความเร็ว',
  },
  1: {
    title: 'เร่งความเร็วได้แล้ว',
    text: 'กด Shift หรือ Space ค้างเพื่อเร่ง ปล่อยแล้วจะกลับสู่ความเร็วเดิม บนมือถือใช้ปุ่มเร่ง ↗',
    action: 'พร้อมแล้ว ไปฝึกเก็บอักษร',
  },
  2: {
    title: '↑ ตัว C อยู่ในกระเป๋าตรงนี้',
    text: 'ดูกระเป๋าอักษรในกรอบสว่างด้านบน ใต้สนามเกม C ที่เพิ่งเก็บแสดงอยู่ที่นี่ และจำนวนเพิ่มเป็น 1 ตัว เราจะเก็บไว้ใช้เรียงคำในประตู',
    action: 'เห็น C ในกระเป๋าแล้ว ไปฝึกเปิดกล่อง',
  },
  3: {
    title: '↑ A และ T เพิ่มในกระเป๋าแล้ว',
    text: 'อักษรใหม่ที่เน้นสีคือ A และ T จากกล่องเงิน รวมกับ C เดิมเป็น 3 ตัว รางวัลจากกล่องจะมาอยู่ในกระเป๋าเดียวกับอักษรที่เดินเก็บ',
    action: 'เห็น C A T ครบแล้ว ไปฝึกเข้าประตู',
  },
};
export default function TutorialReview({
  step,
  onContinue,
}: {
  step: number;
  onContinue: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const review = reviews[step];
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, []);
  if (!review) return null;
  return (
    <section ref={ref} tabIndex={-1} className="tutorial-review" aria-labelledby="review-title">
      <div>
        <span className="eyebrow">เกมหยุดรอ · กดไปต่อเมื่อพร้อม</span>
        <h2 id="review-title">{review.title}</h2>
        <p>{review.text}</p>
      </div>
      <button className="button primary" onClick={onContinue}>
        {review.action}
      </button>
    </section>
  );
}
