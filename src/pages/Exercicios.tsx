import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Dumbbell, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollToTop } from "@/components/ScrollToTop";

interface ExerciseCategory {
    id: string;
    label: string;
    emoji: string;
    folder: string;
    files: string[];
}

const EXERCISE_DATA: ExerciseCategory[] = [
    {
        id: "abdomen",
        label: "Abdômen",
        emoji: "🔥",
        folder: "exercicios-para-abdomen",
        files: [
            "Abd Concentrado Braços estendidos.gif",
            "Abdominal com Carga.gif",
            "Abdominal Concentrado.gif",
        ],
    },
    {
        id: "bracos",
        label: "Braços",
        emoji: "💪",
        folder: "exercicios-para-braços",
        files: [
            "Apoio de frente pegada fechada parede.gif",
            "arnold_dips-maschine.gif",
            "biceps concentrado unilateral no cross.gif",
            "biceps polia alta dupla.gif",
            "biceps unilateral com banco scort no cross.gif",
            "biceps unilateral cross.gif",
            "biceps unilateral polia alta cross.gif",
            "desvio radial.gif",
            "flex de cotovelo fechado com halteres.gif",
            "flex de cotovelo fechado livre.gif",
            "flex de cotovelo fechado.gif",
            "Flexão de punho com barra.gif",
            "Flexão de punho com halteres.gif",
            "Hiperextensão de punho com barra.gif",
            "Hiperextensão de punho com halteres.gif",
            "Kick back sentado com halteres.gif",
            "Kick back.gif",
            "rosca  direta no banco scort.gif",
            "rosca alternada aparelho biarticular.gif",
            "rosca alternada com giro.gif",
            "rosca alternada pegada neutra sentado no banco.gif",
            "rosca alternada pegada neutra.gif",
            "Rosca Concentrada 2.gif",
            "Rosca Concentrada.gif",
            "rosca consentrada unilateral  no banco declinado.gif",
            "rosca dierata pegada invertida barra W.gif",
            "rosca dierta pegada aberta.gif",
            "rosca dierta pegada fechada.gif",
            "rosca direta apaiada no banco barra W.gif",
            "rosca direta barra pegada fechada sentado no banco.gif",
            "rosca direta barra W sentado banco.gif",
            "rosca direta barra W.gif",
            "rosca direta deitado no banco reto no cross.gif",
            "rosca direta no cross barra W.gif",
            "rosca direta pegada fechada barra W.gif",
            "rosca neutra  unilateral no banco scort.gif",
            "rosca neutra com halteres sentado no banco.gif",
            "rosca neutra com halteres.gif",
            "rosca neutra no banco scort aparelho.gif",
            "rosca no banco scort barra W.gif",
            "rosca no scort.gif",
            "Rosca Scott Unil com Halteres.gif",
            "rosca unilateral com halteres sentado no banco.gif",
            "rosca unilateral com halteres.gif",
            "rosca unilateral pegada neutra com halteres.gif",
            "supino declinado no smit.gif",
            "Supino declinado pegada fechada.gif",
            "Supino pegada fechada.gif",
            "triceps afundo no banco.gif",
            "triceps apoaiado na pareda.gif",
            "triceps com halteres no banco reto.gif",
            "triceps extenção de cotovelo unilateral.gif",
            "Triceps frances barra W.gif",
            "triceps françes bilateral no cross.gif",
            "triceps françes unilateral deitado no banco.gif",
            "triceps françes unilateral no corss.gif",
            "triceps inclinado no cross bilateral.gif",
            "triceps na paralela maquiba.gif",
            "triceps no aparelho scort.gif",
            "triceps no cross barra triangulo.gif",
            "triceps no cross deitado no banco reto.gif",
            "triceps paralelo no banco.gif",
            "triceps patada blateral com halteres.gif",
            "triceps patada unilateral com halteres.gif",
            "triceps pateda com alteres.gif",
            "triceps pegada pronada uniatres no cross.gif",
            "triceps testa com barra.gif",
            "Triceps testa com halteres.gif",
            "triceps testa pegada neutra deitado no banco.gif",
            "triceps tresta com halteres.gif",
            "triceps unilateral 90G deitado.gif",
            "triceps unilateral deitado no banco.gif",
            "triceps unilateral pegada supinada.gif",
            "triceps.gif",
        ],
    },
    {
        id: "costas",
        label: "Costas",
        emoji: "🏋️",
        folder: "exercicios-para-costas",
        files: [
            "banco romano sem peso.gif",
            "banco romano.gif",
            "barra livre com peso.gif",
            "barra livre pegada aberta joelhos flexionados.gif",
            "barra livre pegada aberta no cross.gif",
            "Barra Livre pegada aberta.gif",
            "barra livre pegada fechada pronada.gif",
            "barra livre pegada pronada.gif",
            "barra no gravitan.gif",
            "barra no graviton em pé.gif",
            "crucifixo inverso.gif",
            "enge_klimmzuege_obergriff.gif",
            "Extensão de tronco máquina.gif",
            "Fitness Gifs 4 U.gif",
            "Hiperextensão do tronco.gif",
            "Hiperextensões sem dispositivo (banco).gif",
            "levantamento terra no smith.gif",
            "Pull Over com Barra.gif",
            "Pull Over na polia com corda.gif",
            "pulley costa maquina.gif",
            "pulley costa unilateral.gif",
            "pulley frente pegada supinada.gif",
            "pulley frente pegaga fechda pronada.gif",
            "pulley pegada aberta atras da nuca.gif",
            "pulley pegada aberta pronada.gif",
            "pulley pegada aberta.gif",
            "puxada maquina pegada supinada.gif",
            "puxada maquina.gif",
            "Puxador Costas por trás Máquina.gif",
            "remada aberta no banco inclinada pega supinada.gif",
            "remada aberta no banco inclinado com halteres.gif",
            "remada articulada pegada supinada.gif",
            "remada articulada.gif",
            "remada baixa no pulley pegada aberta supinada.gif",
            "remada baixa unilateral no cross.gif",
            "remada baixa unilateral pegada neutra.gif",
            "remada beixa no pulley triangulo.gif",
            "remada cavalinha pegada aberta.gif",
            "remada cavalinho unilateral.gif",
            "remada cavalino com barra.gif",
            "remada com banco inclinado com haltres.gif",
            "remada com barra.gif",
            "remada inclinada no smith.gif",
            "remada inclinda no banco pegada supinda puxada fechada.gif",
            "remada livre  com halteres.gif",
            "remada maquina pronada.gif",
            "remada no banco inclinado pegada pronada com barra.gif",
            "remada serrote.gif",
            "remada unilateral cavalindo barra puxada fechada.gif",
            "Remanda Curvada Barra.gif",
            "Remanda unil com apoio banco.gif",
            "Remo com barra no punho.gif",
            "superman.gif",
            "voador invertido.gif",
        ],
    },
    {
        id: "ombros",
        label: "Ombros",
        emoji: "🎯",
        folder: "exercicios-para-ombros",
        files: [
            "crucifixo inverso no banco inclinado.gif",
            "crucifixo inverso no cross em pé .gif",
            "crucifixo inverso no cross no banco reto .gif",
            "Crucifixo Invertido com Halteres.gif",
            "Crucifixo I_nvertido Polia Alta.gif",
            "Desenvolmento com Halteres.gif",
            "Desenvolmento Frontal com Elastico.gif",
            "Desenvolmento Máquina.gif",
            "desenvolvimento barra atras da nuca.gif",
            "desenvolvimento barra sentado atras nuca.gif",
            "desenvolvimento cabo cross.gif",
            "Desenvolvimento com Barra sentado.gif",
            "Desenvolvimento com Barra.gif",
            "Desenvolvimento com Halteres.gif",
            "desenvolvimento com rotação.gif",
            "desenvolvimento na barra.gif",
            "desenvolvimento no smith barra na nuca.gif",
            "Desenvolvimento por tras com barra.gif",
            "Desenvolvimento por trás com barra.gif",
            "Desenvolvimento Sentado com Halteres.gif",
            "Desenvolvimento Sentado Smith.gif",
            "Desenvolvimento Smith.gif",
            "desenvolvimento unilateral.gif",
            "desnvolvimento barra frente sentado.gif",
            "elevação bilateral na maquina.gif",
            "elevação do cotovelo unilateral.gif",
            "Elevação Frontal com Barra.gif",
            "elevação frontal com halteres.gif",
            "Elevação Frontal Crossover.gif",
            "elevação lateral inclinado sentado.gif",
            "elevação lateral pegda neutra inversa.gif",
            "elevação lateral sentado no banco.gif",
            "elevação letaral com haltrers.gif",
            "elevação leteral cruzada no cross.gif",
            "elevação unilateral frontal.gif",
            "elevação unilateral no cross.gif",
            "elevação unilateral.gif",
            "encolhimento livre com halteres.gif",
            "encolhimento maquina.gif",
            "encolhimento na barra livre.gif",
            "encolhimento no smith.gif",
            "encolhimento pegada fechada barra no cross.gif",
            "encolhimento sentado no banco com halteres.gif",
            "encolhimento sentado no banco inlinado com halteres.gif",
            "remada alta com barra no cross.gif",
            "remada alta com barra pegada aberta.gif",
            "remada alta com barra W.gif",
            "remada alta com halteres bilateral.gif",
            "remada alta com halteres.gif",
            "remada alta no cross.gif",
            "remada alta pegada abeta com barra.gif",
            "remada livre com barra.gif",
            "Remanda Alta com Barra.gif",
            "voador inverso.gif",
        ],
    },
    {
        id: "pernas",
        label: "Pernas",
        emoji: "🦵",
        folder: "exercicios-para-pernas",
        files: [
            "Abduçao de quadril em pé.gif",
            "adutora na tração do cabo cross.gif",
            "Adução na polia.gif",
            "afundo livre.gif",
            "agachamento barra.gif",
            "agachamento bulgaro com barra.gif",
            "agachamento bulgaro.gif",
            "Agachamento com halteres com uma perna.gif",
            "Agachamento livre com barra.gif",
            "agachamento livre pés juntos.gif",
            "agachamento na maquina.gif",
            "agachamento no banco.gif",
            "agachamento no cross.gif",
            "agachamento pés afastados.gif",
            "Agachamento sumo com halteres (2).gif",
            "agachamento sumo com halteres.gif",
            "agachamento sumo livre.gif",
            "Agachamento Sumo Peso Corporal.gif",
            "Agachamento terra com halteres do lado.gif",
            "cadeira adutora.gif",
            "cadeira extensora.gif",
            "cadeira flex.gif",
            "elevação pelvica livre.gif",
            "Extensão de quadril em pé com joelhos flexionados.gif",
            "Extensão de quadril em pé na polia.gif",
            "Extensão de Quadril em pé.gif",
            "flex de joelho  em pé no cabo cross.gif",
            "Flexão Plantar com peso corporal.gif",
            "leg press pés afastados.gif",
            "leg press.gif",
            "levantamento tarra com halteres.gif",
            "levantamento terra com barra.gif",
            "Levantamento terrra com halteres frente.gif",
            "mesa flex unilateral.gif",
            "mesa flex.gif",
            "máquina adutora.gif",
            "panturrinha no leg press.gif",
            "passada a frente com barra.gif",
            "passada a frente com halteres.gif",
            "passada com halteres.gif",
            "passada para tras com barra.gif",
            "Retrocesso com Barra.gif",
            "Retrocesso com halteres.gif",
            "seitlicher_ausfallschritt_mit_langhantel.gif",
            "stiff com barra.gif",
            "Stiff com Halteres.gif",
            "stiff no smth unilateral.gif",
            "stiff no smth.gif",
            "Stiff unil com medball.gif",
            "stiff unilateral com kettibel.gif",
            "stiff unilateral.gif",
            "stiff.gif",
            "tiefe_langhantel_kniebeuge.gif",
        ],
    },
];

const TOTAL_EXERCISES = EXERCISE_DATA.reduce((sum, cat) => sum + cat.files.length, 0);

export default function Exercicios() {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

    const filteredCategories = useMemo(() => {
        let data = EXERCISE_DATA;
        if (selectedCategory) {
            data = data.filter((c) => c.id === selectedCategory);
        }
        if (search.trim()) {
            const q = search.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
            data = data
                .map((cat) => ({
                    ...cat,
                    files: cat.files.filter((f) =>
                        f.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").includes(q)
                    ),
                }))
                .filter((cat) => cat.files.length > 0);
        }
        return data;
    }, [selectedCategory, search]);

    const toggleExpand = (catId: string) => {
        setExpandedCards((prev) => {
            const next = new Set(prev);
            if (next.has(catId)) next.delete(catId);
            else next.add(catId);
            return next;
        });
    };

    const formatName = (filename: string) =>
        filename.replace(/\.gif$/i, "").replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    return (
        <div className="min-h-screen bg-background">
            {/* Hero */}
            <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 py-12 md:py-16">
                <div className="container mx-auto max-w-7xl px-4">
                    <div className="text-center space-y-4">
                        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary font-medium">
                            <Dumbbell className="h-4 w-4" />
                            {TOTAL_EXERCISES} exercícios disponíveis
                        </div>
                        <h1 className="text-3xl md:text-5xl font-bold text-foreground tracking-tight">
                            Exercícios para o <span className="text-primary">Corpo</span>
                        </h1>
                        <p className="text-muted-foreground max-w-xl mx-auto">
                            Biblioteca completa com exercícios animados organizados por grupo muscular.
                            Encontre o exercício perfeito para sua rotina.
                        </p>
                    </div>
                </div>
            </section>

            <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Buscar exercício..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button
                            variant={selectedCategory === null ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedCategory(null)}
                        >
                            Todos
                        </Button>
                        {EXERCISE_DATA.map((cat) => (
                            <Button
                                key={cat.id}
                                variant={selectedCategory === cat.id ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedCategory(cat.id)}
                                className="gap-1.5"
                            >
                                <span>{cat.emoji}</span>
                                {cat.label}
                                <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">
                                    {cat.files.length}
                                </Badge>
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Results count */}
                {search && (
                    <p className="text-sm text-muted-foreground">
                        {filteredCategories.reduce((s, c) => s + c.files.length, 0)} resultado(s) encontrado(s)
                    </p>
                )}

                {/* Category groups */}
                <div className="space-y-8">
                    {filteredCategories.map((cat) => {
                        const isExpanded = expandedCards.has(cat.id);
                        const INITIAL_SHOW = 8;
                        const visibleFiles = isExpanded ? cat.files : cat.files.slice(0, INITIAL_SHOW);
                        const hasMore = cat.files.length > INITIAL_SHOW;

                        return (
                            <section key={cat.id}>
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-2xl">{cat.emoji}</span>
                                    <h2 className="text-xl font-bold text-foreground">{cat.label}</h2>
                                    <Badge variant="secondary">{cat.files.length} exercícios</Badge>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {visibleFiles.map((file) => (
                                        <Card
                                            key={`${cat.folder}/${file}`}
                                            className="overflow-hidden group transition-all duration-300 hover:shadow-lg hover:border-primary/30"
                                        >
                                            <div className="aspect-square bg-muted overflow-hidden">
                                                <img
                                                    src={`/exercicios/${cat.folder}/${encodeURIComponent(file)}`}
                                                    alt={formatName(file)}
                                                    loading="lazy"
                                                    className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                                                />
                                            </div>
                                            <div className="p-3">
                                                <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
                                                    {formatName(file)}
                                                </p>
                                            </div>
                                        </Card>
                                    ))}
                                </div>

                                {hasMore && (
                                    <div className="flex justify-center mt-4">
                                        <Button
                                            variant="ghost"
                                            onClick={() => toggleExpand(cat.id)}
                                            className="gap-1.5 text-primary"
                                        >
                                            {isExpanded ? (
                                                <>
                                                    <ChevronUp className="h-4 w-4" />
                                                    Mostrar menos
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown className="h-4 w-4" />
                                                    Ver todos os {cat.files.length} exercícios
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </div>

                {filteredCategories.length === 0 && (
                    <div className="text-center py-16 space-y-3">
                        <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground/50" />
                        <p className="text-muted-foreground">Nenhum exercício encontrado para "{search}"</p>
                    </div>
                )}
            </div>

            <ScrollToTop />
        </div>
    );
}
