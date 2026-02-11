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
            "Abdominal Concentrado.gif",
            "Abdominal com Carga.gif",
        ],
    },
    {
        id: "bracos",
        label: "Braços",
        emoji: "💪",
        folder: "exercicios-para-braços",
        files: [
            "Apoio de frente pegada fechada parede.gif",
            "Flexão de punho com barra.gif",
            "Flexão de punho com halteres.gif",
            "Hiperextensão de punho com barra.gif",
            "Hiperextensão de punho com halteres.gif",
            "Kick back sentado com halteres.gif",
            "Kick back.gif",
            "Rosca Concentrada 2.gif",
            "Rosca Concentrada.gif",
            "Rosca Scott Unil com Halteres.gif",
            "Supino declinado pegada fechada.gif",
            "Supino pegada fechada.gif",
            "Triceps frances barra W.gif",
            "Triceps testa com halteres.gif",
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
            "rosca  direta no banco scort.gif",
            "rosca alternada aparelho biarticular.gif",
            "rosca alternada com giro.gif",
            "rosca alternada pegada neutra sentado no banco.gif",
            "rosca alternada pegada neutra.gif",
            "rosca consentrada unilateral  no banco declinado.gif",
            "rosca dierata pegada invertida barra W.gif",
            "rosca dierta pegada aberta.gif",
            "rosca dierta pegada fechada.gif",
            "rosca direta apaiada no banco barra W.gif",
            "rosca direta barra W sentado banco.gif",
            "rosca direta barra W.gif",
            "rosca direta barra pegada fechada sentado no banco.gif",
            "rosca direta deitado no banco reto no cross.gif",
            "rosca direta no cross barra W.gif",
            "rosca direta pegada fechada barra W.gif",
            "rosca neutra  unilateral no banco scort.gif",
            "rosca neutra com halteres sentado no banco.gif",
            "rosca neutra com halteres.gif",
            "rosca neutra no banco scort aparelho.gif",
            "rosca no banco scort barra W.gif",
            "rosca no scort.gif",
            "rosca unilateral com halteres sentado no banco.gif",
            "rosca unilateral com halteres.gif",
            "rosca unilateral pegada neutra com halteres.gif",
            "supino declinado no smit.gif",
            "triceps banco.gif",
            "triceps banco2.gif",
            "triceps corda cross.gif",
            "triceps corda no cross com carga.gif",
            "triceps cruzado no cross.gif",
            "triceps deitado barra W.gif",
            "triceps deitado unilateral com halteres.gif",
            "triceps duplo no cross.gif",
            "triceps frances com halteres bilateral sentado.gif",
            "triceps frances com halteres unilateral sentado.gif",
            "triceps frances deitado com halteres.gif",
            "triceps mergulho paralelas.gif",
            "triceps no banco com carga.gif",
            "triceps no cross com barra.gif",
            "triceps no cross com carga.gif",
            "triceps no cross invertido com carga.gif",
            "triceps no cross unilateral invertido.gif",
            "triceps no cross unilateral.gif",
            "triceps no cross.gif",
            "triceps no smith.gif",
            "triceps paralelas.gif",
            "triceps sentado unilateral com halteres.gif",
            "triceps testa barra w.gif",
            "triceps unilateral no cross.gif",
        ],
    },
    {
        id: "costas",
        label: "Costas",
        emoji: "🏋️",
        folder: "exercicios-para-costas",
        files: [
            "Barra fixa aberta.gif",
            "Barra fixa fechada.gif",
            "Barra fixa pegada neutra.gif",
            "Levantamento terra.gif",
            "Pull dow aberto.gif",
            "Pull dow fechado.gif",
            "Pull dow invertido.gif",
            "Pull dow neutra.gif",
            "Pull dow unilateral.gif",
            "Puxada fechada.gif",
            "Puxada unilateral cross.gif",
            "Remada alta com barra.gif",
            "Remada articulada aberta pronada.gif",
            "Remada articulada aberta supinada.gif",
            "Remada articulada fechada.gif",
            "Remada articulada neutra.gif",
            "Remada cavalinho bilateral.gif",
            "Remada cavalinho pronada bilateral.gif",
            "Remada cavalinho pronada unilateral.gif",
            "Remada cavalinho supinada bilateral.gif",
            "Remada cavalinho unilateral.gif",
            "Remada com barra aberta pronada.gif",
            "Remada com barra neutra.gif",
            "Remada com barra supinada.gif",
            "Remada com halteres pronada bilateral sentado.gif",
            "Remada com halteres pronada unilateral com banco.gif",
            "Remada com halteres pronada unilateral sentado.gif",
            "Remada com halteres supinada bilateral deitado no banco.gif",
            "Remada com halteres supinada bilateral sentado.gif",
            "Remada com halteres supinada deitado no banco.gif",
            "Remada com halters neutra bilateral sentado.gif",
            "Remada com halters neutra unilateral com banco.gif",
            "Remada no cross com corda.gif",
            "Remada no cross unilateral em pé.gif",
            "Remada no smit pronada.gif",
            "Remada polia aberta pegada pronada.gif",
            "Remada polia fechada.gif",
            "Remada polia neutra.gif",
            "Remada polia supinada.gif",
            "Remada polia unilateral neutra.gif",
            "Remada polia unilateral pronada.gif",
            "Remada polia unilateral supinada.gif",
            "Serrátil na polia com corda.gif",
            "Serrátil sentado na polia baixa.gif",
            "arnoldklimmzug.gif",
            "puxada em pe com cross.gif",
            "puxada frontal com corda.gif",
            "remada baixa com triângulo.gif",
            "remada em pé com cross.gif",
            "remada neutra deitado no banco.gif",
            "remada no smit supinado.gif",
            "remada pronada bilateral deitado no banco com halteres.gif",
            "remada unilateral pronada deitado no banco com halteres.gif",
            "serrátil deitado com halteres.gif",
        ],
    },
    {
        id: "ombros",
        label: "Ombros",
        emoji: "🎯",
        folder: "exercicios-para-ombros",
        files: [
            "Crucifixo invertido c halteres sentado.gif",
            "Crucifixo invertido com halteres em pé.gif",
            "Crucifixo invertido deitado no banco com halteres.gif",
            "Crucifixo invertido no cross.gif",
            "Desenvolvimento aberto pegada pronada no smit.gif",
            "Desenvolvimento aberto pegada supinada.gif",
            "Desenvolvimento arnold.gif",
            "Desenvolvimento com halteres sentado.gif",
            "Desenvolvimento no smit sentado.gif",
            "Desenvolvimento pegada neutra.gif",
            "Crucifixo inverido no aparelho.gif",
            "Elevação frontal alternada com halteres em pé.gif",
            "Elevação frontal bilateral com halteres em pé.gif",
            "Elevação frontal com barra em pé.gif",
            "Elevação frontal com corda no cross em pé.gif",
            "Elevação frontal no cross bilateral em pé.gif",
            "Elevação frontal no cross unilateral em pé.gif",
            "Elevação lateral com halteres deitado no banco lateral.gif",
            "Elevação lateral com halteres em pé.gif",
            "Elevação lateral com halteres sentado.gif",
            "Elevação lateral no cross bilateral.gif",
            "Elevação lateral no cross deitado no banco lateral.gif",
            "Elevação lateral no cross unilateral.gif",
            "Elevação lateral no cross unilateral2.gif",
            "Encolhimento barra por trás.gif",
            "Encolhimento com barra.gif",
            "Encolhimento com halteres.gif",
            "Encolhimento no smith.gif",
            "Remada alta barra W.gif",
            "Remada alta com corda no cross.gif",
            "Remada alta no smit.gif",
            "Remada alta unilateral no cross.gif",
            "crucifixo invertido c halteres em pe.gif",
            "crucifixo invertido deitado banco reto com halteres.gif",
            "crucifixo invertido no cross.gif",
            "crucifixo invertido unilateral com halteres.gif",
            "crucifixo invertido unilateral cross deitado no banco.gif",
            "crucifixo invertido unilateral cross em pé.gif",
            "desenvolvimento aberto pegada pronada com halteres.gif",
            "desenvolvimento aberto pegada pronada.gif",
            "desenvolvimento articulado aberto pegada pronada.gif",
            "desenvolvimento articulado aberto pegada supinada.gif",
            "desenvolvimento articulado neutro.gif",
            "elevação frontal bilateral barra w.gif",
            "elevação frontal unilateral no cross.gif",
            "elevação frontal unilateral.gif",
            "elevação lateral aparelho.gif",
            "elevação lateral c halteres sentado no banco.gif",
            "elevação lateral com halteres sentado.gif",
            "elevação lateral em pé com Halteres.gif",
            "elevação lateral unilateral no cross.gif",
            "encolhimento aparelho.gif",
            "exercicio facial pull.gif",
            "remada alta com halteres.gif",
        ],
    },
    {
        id: "pernas",
        label: "Pernas",
        emoji: "🦵",
        folder: "exercicios-para-pernas",
        files: [
            "Abdução no aparelho.gif",
            "Adução no aparelho.gif",
            "Agachamento livre barra.gif",
            "Agachamento livre halteres.gif",
            "Agachamento livre.gif",
            "Agachamento no smith.gif",
            "Agachamento sumô barra.gif",
            "Agachamento sumô halteres.gif",
            "Avanço barra.gif",
            "Avanço halteres.gif",
            "Cadeira extensora bilateral.gif",
            "Cadeira extensora unilateral.gif",
            "Cadeira flexora bilateral.gif",
            "Cadeira flexora unilateral.gif",
            "Elevação de panturrilha no leg press.gif",
            "Elevação de panturrilha sentado.gif",
            "Elevação pelvica com barra.gif",
            "Flexora deitado bilateral.gif",
            "Flexora deitado unilateral.gif",
            "Hack machine.gif",
            "Leg press 45 bilateral.gif",
            "Leg press 45 unilateral.gif",
            "Leg press horizontal bilateral.gif",
            "Leg press horizontal unilateral.gif",
            "Mesa flexora bilateral.gif",
            "Mesa flexora unilateral.gif",
            "Panturrilha em pe bilateral.gif",
            "Panturrilha em pe no smith bilateral.gif",
            "Panturrilha em pe no smith unilateral.gif",
            "Panturrilha em pe unilateral.gif",
            "Passada alternada com barra.gif",
            "Passada alternada com halteres.gif",
            "Stiff barra.gif",
            "Stiff halteres.gif",
            "abdução no cross em pé.gif",
            "abdução no cross no solo.gif",
            "abdução.gif",
            "adução no cross em pé.gif",
            "agachamento bulgaro halteres.gif",
            "agachamento no smith frontal.gif",
            "agachamento sumô livre.gif",
            "agachamento unilateral no smith.gif",
            "agachamento unilateral pé no banco.gif",
            "elevação pelvica apoiado no banco.gif",
            "elevação pelvica apoiado no banco2.gif",
            "elevação pelvica no solo.gif",
            "elevação pelvica unilateral apoiado no banco.gif",
            "extensão no cross em pé.gif",
            "extensão no cross no solo.gif",
            "flexão da perna no cross em pe.gif",
            "flexão da perna no cross no solo.gif",
            "panturrilha  sentado no smith.gif",
            "panturrilha no hack.gif",
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
