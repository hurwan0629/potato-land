import { useEffect,useState } from "react";
import { useParams } from "react-router";
import { mypageApi } from "../../api/mypageApi";
import SideMenu from "../../components/layout/sideMenu";
import { useAuth } from "../../context/AuthContext";

const loaders={listings:mypageApi.myListings,favorites:mypageApi.myFavorites,history:mypageApi.myHistory,reviews:mypageApi.myReviews};
export default function MyPage(){const{id}=useParams();const{user}=useAuth();const[tab,setTab]=useState("listings");const[data,setData]=useState({items:[]});const[error,setError]=useState("");useEffect(()=>{loaders[tab]({page:1}).then((r)=>setData(r.data)).catch((e)=>setError(e.message));},[tab]);const menuItems=[{to:`/mypage/${id}`,label:"내 정보"},{to:`/mypage/${id}/edit`,label:"정보 수정"}];return <div style={{display:"flex"}}><SideMenu items={menuItems}/><div style={{padding:40,flex:1}}><h2>마이페이지</h2><p>닉네임: {user?.nickname??id}</p><nav>{Object.keys(loaders).map((name)=><button key={name} onClick={()=>setTab(name)}>{name}</button>)}</nav>{error&&<p role="alert">{error}</p>}<ul>{data.items.map((item,index)=><li key={item.listingIdx??item.transactionIdx??item.reviewIdx??index} style={{marginTop:8}}>{item.title??item.listingTitle??item.content??item.status} {item.displayPrice!=null&&`${Number(item.displayPrice).toLocaleString()}원`}</li>)}</ul></div></div>;}
