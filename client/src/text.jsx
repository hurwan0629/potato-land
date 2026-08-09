import { useState } from "react";
import Pagination from "./components/list/Pagination";
import SortTabs from "./components/list/SortTabs";
import ListItem from "./components/list/ListItem";
import Button from "./components/button/Button";
import Dropdown from "./components/button/ChangeMode";
import Input from "./components/input/Input";
export default function ProductListPage() {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("latest");

  const sortOptions = [
    { label: "최신순", value: "latest" },
    { label: "인기순", value: "popular" },
    { label: "마감임박순", value: "deadline" },
  ];

  const product = {
    image: "/placeholder.png",
    name: "상품명",
    price: "가격",
    status: "판매중",
    date: "날짜",
  };

  // 중고 경매 전환
  const [category, setCategory] = useState("secondhand");

  const categoryOptions = [
    { label: "중고거래", value: "secondhand" },
    { label: "경매장", value: "auction" },
  ];
  // 입력창
  const [productName, setProductName] = useState("")

  return (
    <>
      <Input
        value={productName}
        onChange={(e) => setProductName(e.target.value)}
        placeholder="상품명을 입력해 주세요" />
      {/* // 검색 필터 (outline) */}
      <Dropdown variant="outline" options={categoryOptions} value={category} onChange={setCategory} />

      {/*상품 등록 버튼 (solid) */}
      <Dropdown variant="solid" options={categoryOptions} value={category} onChange={setCategory} />

      <SortTabs
        options={sortOptions}
        selected={sort}
        onChange={setSort}
      />

      <ListItem
        thumbnail={<img src={product.image} alt="이미지준비중" />}
        title={product.name}
        subtitle={product.price}
        status={product.status}
        date={product.date}
        action={<Button variant="text" size="sm">거래 상세</Button>}
      />

      <Pagination currentPage={page} totalPages={25} onPageChange={setPage} />
    </>
  );
}