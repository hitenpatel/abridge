import React from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Linking 
} from 'react-native';
import { trpc } from '../lib/trpc';
import { CreditCard, Calendar, User, ChevronRight } from 'lucide-react-native';

export function PaymentsScreen() {
  const { data: payments, isLoading, isError, refetch } = trpc.payments.listOutstandingPayments.useQuery();
  const createSession = trpc.payments.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        Linking.openURL(data.url);
      }
    },
  });

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error loading payments.</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: { id: string; title: string; amount: number; category: string; dueDate: Date | null; childId: string; childName: string } }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
        <Text style={styles.amountText}>£{(item.amount / 100).toFixed(2)}</Text>
      </View>
      
      <Text style={styles.titleText}>{item.title}</Text>
      
      <View style={styles.metaContainer}>
        <View style={styles.metaRow}>
          <User size={14} color="#6b7280" />
          <Text style={styles.metaText}>{item.childName}</Text>
        </View>
        {item.dueDate && (
          <View style={styles.metaRow}>
            <Calendar size={14} color="#6b7280" />
            <Text style={styles.metaText}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity 
        style={styles.payButton}
        onPress={() => createSession.mutate({ paymentItemId: item.id, childId: item.childId })}
        disabled={createSession.isPending}
      >
        <Text style={styles.payButtonText}>
          {createSession.isPending ? "Connecting..." : "Pay Now"}
        </Text>
        <ChevronRight size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={payments}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.id}-${item.childId}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <CreditCard size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No outstanding payments</Text>
            <Text style={styles.emptySubtitle}>You're all caught up!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    color: '#1d4ed8',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  titleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  metaContainer: {
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
  },
  payButton: {
    backgroundColor: '#1d4ed8',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
});
