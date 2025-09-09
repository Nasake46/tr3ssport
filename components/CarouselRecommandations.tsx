// components/CarouselRecommandations.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit as qLimit,
} from 'firebase/firestore';
import { firestore, auth } from '@/firebase';

type Review = {
  id: string;
  authorName: string;
  rating: number; // 1..5
  comment: string;
  createdAt?: any;
};

type Props = {
  coachId?: string;         // si non fourni, tentera auth.currentUser?.uid
  heading?: string;         // titre au-dessus du carrousel
  limitCount?: number;      // nb max d’items à charger
};

const COLORS = {
  text: '#121631',      // oxford
  sub:  '#667085',
  card: '#FFFFFF',
  line: '#E5E7EB',
  star: '#f5a623',
  bg:   '#FFFFFF',
};

const ITEM_WIDTH = Math.round(Dimensions.get('window').width * 0.74);

export default function CarouselRecommandations({
  coachId,
  heading = 'Recommandations',
  limitCount = 20,
}: Props) {
  const fallbackCoach = auth.currentUser?.uid;
  const finalCoachId = coachId || fallbackCoach;

  const [data, setData] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!finalCoachId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const q = query(
          collection(firestore, 'coachReviews'),
          where('coachId', '==', finalCoachId),
          orderBy('createdAt', 'desc'),
          qLimit(limitCount)
        );
        const snap = await getDocs(q);
        setData(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      } catch (e) {
        console.log('CarouselRecommandations load error', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [finalCoachId, limitCount]);

  const avg = useMemo(() => {
    if (!data.length) return '—';
    const s = data.reduce((acc, r) => acc + (r.rating || 0), 0);
    return (s / data.length).toFixed(1);
  }, [data]);

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>{heading}</Text>
        <View style={styles.avgRow}>
          <FontAwesome name="star" size={14} color={COLORS.star} />
          <Text style={styles.avgText}> {avg} </Text>
          <Text style={styles.countText}>({data.length})</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator />
      ) : data.length === 0 ? (
        <Text style={styles.empty}>Pas encore d’avis.</Text>
      ) : (
        <FlatList
          horizontal
          data={data}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.header}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarTxt}>
                    {(item.authorName || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text numberOfLines={1} style={styles.name}>
                  {item.authorName || 'Utilisateur'}
                </Text>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <FontAwesome
                      key={i}
                      name={i <= (item.rating || 0) ? 'star' : 'star-o'}
                      size={12}
                      color={COLORS.star}
                    />
                  ))}
                </View>
              </View>
              <Text style={styles.comment} numberOfLines={4}>
                {item.comment}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 40,
    backgroundColor: COLORS.bg,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  avgRow: { flexDirection: 'row', alignItems: 'center' },
  avgText: { fontWeight: '700', color: COLORS.text },
  countText: { color: COLORS.sub },
  empty: { color: COLORS.sub, marginLeft: 20 },
  card: {
    width: ITEM_WIDTH,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginRight: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E6EAF2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { color: COLORS.text, fontWeight: '700', fontSize: 12 },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  stars: { flexDirection: 'row', gap: 2 },
  comment: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 18,
  },
});
