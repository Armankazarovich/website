import type { Metadata } from "next";
import { CheckCircle, Factory, Award, Users, Leaf } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";

export const metadata: Metadata = {
  title: "О производстве",
  description: "ООО ПИТИ (ПилоРус) — производитель пиломатериалов в Химках. 2000 м² склад, ГОСТ-продукция, работаем напрямую.",
};

export default function AboutPage() {
  return (
    <div className="container py-12">
      <BackButton href="/" label="Главная" />
      <h1 className="font-display font-bold text-4xl mb-3">О производстве</h1>
      <p className="text-muted-foreground text-lg mb-10 max-w-2xl">
        ООО «ПИТИ» — производитель пиломатериалов в Подмосковье. Работаем напрямую
        с потребителями уже более 10 лет.
      </p>

      {/* Company facts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {[
          { value: "2000 м²", label: "Площадь склада" },
          { value: "10+", label: "Лет на рынке" },
          { value: "500+", label: "Клиентов" },
          { value: "100%", label: "ГОСТ" },
        ].map((stat) => (
          <div key={stat.label} className="text-center p-6 bg-card rounded-2xl border border-border">
            <p className="font-display font-bold text-4xl text-primary mb-2">{stat.value}</p>
            <p className="text-muted-foreground text-sm">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
        <div className="space-y-6">
          <div>
            <h2 className="font-display font-bold text-2xl mb-4">Наша история</h2>
            <div className="space-y-3 text-muted-foreground leading-relaxed">
              <p>
                ООО «ПИТИ» работает на рынке пиломатериалов более 10 лет. За это время
                мы выстроили надёжные отношения с клиентами — строительными компаниями,
                частными застройщиками и розничными покупателями.
              </p>
              <p>
                Наше производство расположено в г. Химки Московской области на площади
                2000 м². Мы оснащены современным оборудованием для производства широкого
                ассортимента пиломатериалов: доски обрезной, бруса, вагонки, блок-хауса и погонажа.
              </p>
              <p>
                Работаем напрямую с конечным потребителем — без посредников. Это позволяет
                нам предлагать честные цены и гибкие условия сотрудничества.
              </p>
            </div>
          </div>

          <div>
            <h2 className="font-display font-bold text-2xl mb-4">Наши преимущества</h2>
            <ul className="space-y-3">
              {[
                "Производство полного цикла на собственных мощностях",
                "Строгий контроль качества на каждом этапе",
                "Сертифицированная продукция по ГОСТ",
                "Антисептирование материала по запросу",
                "Возможность изготовления по индивидуальным размерам",
                "Официальные документы: накладная, счёт-фактура",
                "Собственный транспорт для доставки",
                "Работа с юридическими лицами (НДС)",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-brand-green mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          {[
            {
              icon: Factory,
              title: "Производственная база",
              desc: "Складской комплекс площадью 2000 м² в г. Химки. Собственные пилорамы и деревообрабатывающие станки.",
              color: "text-brand-orange",
              bg: "bg-brand-orange/10",
            },
            {
              icon: Award,
              title: "Качество и сертификация",
              desc: "Вся продукция изготавливается по ГОСТ. Мы несём ответственность за качество каждой партии.",
              color: "text-blue-600",
              bg: "bg-blue-100",
            },
            {
              icon: Leaf,
              title: "Экологичность",
              desc: "Используем древесину из легальных источников. Все отходы производства перерабатываются.",
              color: "text-brand-green",
              bg: "bg-brand-green/10",
            },
            {
              icon: Users,
              title: "Команда",
              desc: "Опытная команда специалистов с более чем 10-летним стажем в деревообработке.",
              color: "text-purple-600",
              bg: "bg-purple-100",
            },
          ].map((block) => (
            <div key={block.title} className="flex gap-4 p-5 bg-card rounded-2xl border border-border">
              <div className={`w-12 h-12 ${block.bg} rounded-xl flex items-center justify-center shrink-0`}>
                <block.icon className={`w-6 h-6 ${block.color}`} />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{block.title}</h3>
                <p className="text-sm text-muted-foreground">{block.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rekvizity */}
      <div className="bg-muted/30 rounded-2xl p-6">
        <h2 className="font-display font-semibold text-xl mb-4">Реквизиты</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2 text-muted-foreground">
            <p><strong className="text-foreground">Полное название:</strong> Общество с ограниченной ответственностью «ПИТИ»</p>
            <p><strong className="text-foreground">Краткое название:</strong> ООО «ПИТИ»</p>
            <p><strong className="text-foreground">ИНН:</strong> 504712164</p>
            <p><strong className="text-foreground">КПП:</strong> 504701001</p>
          </div>
          <div className="space-y-2 text-muted-foreground">
            <p><strong className="text-foreground">Юридический адрес:</strong> Московская обл., г. Химки, ул. Заводская 2А, стр.28</p>
            <p><strong className="text-foreground">Email:</strong> info@pilo-rus.ru</p>
            <p><strong className="text-foreground">Телефон:</strong> 8-985-970-71-33</p>
          </div>
        </div>
      </div>
    </div>
  );
}
